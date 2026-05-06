const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
} = require('discord.js');

const Database = require('better-sqlite3');
const config = require('../config');
const { canUseTicketTools } = require('./permissions');
const { getProfile } = require('./levels');
const { logInfo } = require('./logger');

const db = new Database('./database.sqlite');

db.prepare(`
  CREATE TABLE IF NOT EXISTS applications (
    user_id TEXT PRIMARY KEY,
    guild_id TEXT NOT NULL,
    thread_id TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_dm',
    current_question INTEGER DEFAULT 0,
    answers TEXT DEFAULT '[]',
    strikes INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
  )
`).run();

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some(col => col.name === column);

  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

ensureColumn('applications', 'thread_id', 'TEXT');
ensureColumn('applications', 'current_question', 'INTEGER DEFAULT 0');
ensureColumn('applications', 'answers', "TEXT DEFAULT '[]'");
ensureColumn('applications', 'strikes', 'INTEGER DEFAULT 0');

const ticketOwners = new Map();
const ticketTypesByThread = new Map();

function ticketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('Open A Ticket')
    .setColor(config.colors.red)
    .setDescription('Need help or want to buy a server perk? Pick the option that fits best below.')
    .addFields(
      {
        name: 'General Support',
        value: 'Questions, server help, role help, or anything basic.',
      },
      {
        name: 'Car Help',
        value: 'Help with car drops, car meets, requests, platforms, or getting cars.',
      },
      {
        name: 'VIP Purchase',
        value: 'Buy VIP for extra channels, VIP drops, early access, and priority perks. Current price: **$5 one-time**.',
      },
      {
        name: 'Priority Access Purchase',
        value: 'Buy Priority Access for first looks at certain drops, faster requests, and limited access perks. Current price: **$3 one-time**.',
      },
      {
        name: 'Other',
        value: 'Anything that does not fit the other options.',
      }
    )
    .setFooter({ text: 'Payments are handled through tickets only. Do not pay random members.' });
}

function reportPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('Report A User')
    .setColor(config.colors.red)
    .setDescription('Use the buttons below to make a report. Keep proof ready.')
    .addFields(
      { name: 'Report Member', value: 'Report a member.' },
      { name: 'Report Staff', value: 'Report a staff member.' },
      { name: 'Scam / Fake Listing', value: 'For fake cars, scams, weird stuff.' }
    )
    .setFooter({ text: 'CVC Reports' });
}

function applicationPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('Staff Applications')
    .setColor(config.colors.red)
    .setDescription('Apply below if you actually want to help the server. The bot will DM you the application one question at a time.')
    .addFields(
      {
        name: 'Ticket Support Requirements',
        value: '• Level 0+\n• 15+\n• can help in tickets\n• patient\n• decent grammar\n• active enough to be useful',
      },
      {
        name: 'Moderator Requirements',
        value: '• Level 5+\n• 16+\n• decent mic\n• active in the server\n• can stay calm and not make things worse',
      },
      {
        name: 'Administrator Requirements',
        value: '• Level 10+\n• 17+\n• working mic\n• trusted\n• active often\n• knows how to handle people properly',
      }
    )
    .setFooter({ text: 'Low effort/fake answers will be denied.' });
}

function ticketButtons() {
  const rowOne = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_general')
      .setLabel('General Support')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('ticket_car')
      .setLabel('Car Help')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_vip_purchase')
      .setLabel('Buy VIP')
      .setStyle(ButtonStyle.Success)
  );

  const rowTwo = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_priority_purchase')
      .setLabel('Buy Priority Access')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('ticket_other')
      .setLabel('Other')
      .setStyle(ButtonStyle.Secondary)
  );

  return [rowOne, rowTwo];
}

function reportButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('report_member').setLabel('Report Member').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('report_staff').setLabel('Report Staff').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('report_scam').setLabel('Scam / Fake Listing').setStyle(ButtonStyle.Danger)
  );
}

function applicationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_support').setLabel('Apply Ticket Support').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_mod').setLabel('Apply Moderator').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('apply_admin').setLabel('Apply Administrator').setStyle(ButtonStyle.Danger)
  );
}

function staffButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_deny').setLabel('Deny').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Secondary)
  );
}

function getApplicationMeta(type) {
  const data = {
    support: {
      title: 'Ticket Support Application',
      label: 'Ticket Support',
      interviewRole: config.roles.awaitingSupportInterview,
      requiredLevel: 0,
      minAge: 15,
      questions: [
        { key: 'age', text: 'How old are you?', minLength: 1, type: 'age' },
        { key: 'timezone', text: 'What timezone are you in, and when are you usually active?', minLength: 8 },
        { key: 'activity', text: 'How active can you actually be in the server?', minLength: 15 },
        { key: 'why', text: 'Why do you want Ticket Support?', minLength: 25 },
        { key: 'support_scenario', text: 'Someone opens a ticket saying they need help finding a car. What would you say/do?', minLength: 35 },
        { key: 'experience', text: 'Do you have any past staff/support experience? If not, say what makes you useful anyway.', minLength: 25 },
      ],
    },

    mod: {
      title: 'Moderator Application',
      label: 'Moderator',
      interviewRole: config.roles.awaitingModInterview,
      requiredLevel: 5,
      minAge: 16,
      questions: [
        { key: 'age', text: 'How old are you?', minLength: 1, type: 'age' },
        { key: 'timezone', text: 'What timezone are you in, and when are you usually active?', minLength: 8 },
        { key: 'mic', text: 'Do you have a working mic?', minLength: 2, type: 'mic' },
        { key: 'why', text: 'Why do you want Moderator?', minLength: 30 },
        { key: 'argument', text: 'Two members start arguing and insulting each other in chat. What do you do?', minLength: 40 },
        { key: 'friend_rulebreak', text: 'Your friend breaks a rule and expects you to ignore it. What do you do?', minLength: 35 },
        { key: 'experience', text: 'Any past staff experience? If yes, where? If no, why should we still consider you?', minLength: 25 },
      ],
    },

    admin: {
      title: 'Administrator Application',
      label: 'Administrator',
      interviewRole: config.roles.awaitingAdminInterview,
      requiredLevel: 10,
      minAge: 17,
      questions: [
        { key: 'age', text: 'How old are you?', minLength: 1, type: 'age' },
        { key: 'timezone', text: 'What timezone are you in, and when are you usually active?', minLength: 8 },
        { key: 'mic', text: 'Do you have a working mic?', minLength: 2, type: 'mic' },
        { key: 'why', text: 'Why do you want Administrator?', minLength: 40 },
        { key: 'experience', text: 'Have you staffed before? Explain where and what you did.', minLength: 30 },
        { key: 'ban_situation', text: 'When would you ban someone instead of timing them out?', minLength: 40 },
        { key: 'staff_abuse', text: 'How would you handle another staff member abusing power?', minLength: 45 },
        { key: 'trust', text: 'Why should we trust you with admin perms and private staff info?', minLength: 45 },
      ],
    },
  };

  return data[type];
}

function canApplyFor(member, type) {
  const meta = getApplicationMeta(type);

  if (!meta) {
    return {
      allowed: false,
      reason: 'That application type does not exist.',
    };
  }

  const profile = getProfile(member.guild.id, member.id);

  if (profile.level < meta.requiredLevel) {
    return {
      allowed: false,
      reason: `You need to be **Level ${meta.requiredLevel}** to apply for **${meta.label}**. You are currently **Level ${profile.level}**.`,
    };
  }

  return { allowed: true };
}

function parseAnswers(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isLowEffortAnswer(answer, question, meta) {
  const cleaned = answer
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const badExact = [
    'idk',
    'i dont know',
    "i don't know",
    'dunno',
    'no',
    'nah',
    'yes',
    'yea',
    'yeah',
    'maybe',
    'nothing',
    'none',
    'n/a',
    'na',
    'ok',
    'okay',
    'good',
    'because',
    'because i want it',
    'i want it',
    'for fun',
    'staff',
    'admin',
    'mod',
    'ticket',
    '.',
    '..',
    '...',
    '-',
    'asdf',
    'qwerty',
    'blah',
    'blah blah',
    'skibidi',
    'sigma',
    'lol',
    'lmao',
  ];

  if (badExact.includes(cleaned)) {
    return { bad: true, reason: 'Your answer looked lazy/fake.' };
  }

  if (/(.)\1{6,}/.test(cleaned)) {
    return { bad: true, reason: 'Your answer looked like spam.' };
  }

  if (question.type === 'age') {
    const age = parseInt(cleaned.match(/\d+/)?.[0], 10);

    if (!age || age < meta.minAge || age > 60) {
      return {
        bad: true,
        reason: `You must be at least **${meta.minAge}** to apply for **${meta.label}**.`,
      };
    }

    return { bad: false };
  }

  if (question.type === 'mic') {
    if (!/(yes|yea|yeah|yep|i do|working|have one|no|nah|dont|don't)/i.test(cleaned)) {
      return {
        bad: true,
        reason: 'Answer the mic question properly. Say if you have one or not.',
      };
    }

    return { bad: false };
  }

  if (cleaned.length < question.minLength) {
    return { bad: true, reason: 'Your answer was way too short.' };
  }

  const wordCount = cleaned.split(' ').filter(Boolean).length;

  if (wordCount < 5 && question.minLength >= 25) {
    return { bad: true, reason: 'Your answer did not explain enough.' };
  }

  const vaguePhrases = [
    'i will help',
    'i can help',
    'im active',
    "i'm active",
    'i am active',
    'i am good',
    "i'm good",
    'trust me',
    'i deserve it',
    'i just want to help',
  ];

  if (vaguePhrases.includes(cleaned)) {
    return {
      bad: true,
      reason: 'Your answer was too vague. Staff need real answers, not one-liners.',
    };
  }

  return { bad: false };
}

async function dmUser(client, userId, embed, content = null) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return false;

  await user.send({ content, embeds: [embed] }).catch(() => null);
  return true;
}

function makeTicketChannelName(type, user) {
  return `${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${user.username}`
    .toLowerCase()
    .slice(0, 90);
}

function getTicketParentId(interaction) {
  return interaction.channel?.parentId || null;
}

function normalTicketPermissions(interaction) {
  return [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.UseExternalEmojis,
      ],
    },
    {
      id: config.roles.staff,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    },
    {
      id: config.roles.ticketSupport,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];
}

function staffReportPermissions(interaction) {
  return [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.UseExternalEmojis,
      ],
    },
    {
      id: config.roles.owner,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    },
    {
      id: config.roles.administrator,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];
}

function getTicketDescription(type) {
  if (type === 'VIP Purchase') {
    return [
      'You opened a **VIP Purchase** ticket.',
      '',
      '**VIP Price:** $5 one-time',
      '',
      '**VIP Includes:**',
      '• Access to VIP channels',
      '• VIP car drops',
      '• Priority requests',
      '• Early access to certain drops/events',
      '• Special VIP role',
      '',
      'Wait for the owner/staff to give payment instructions. Do not pay random members.',
    ].join('\n');
  }

  if (type === 'Priority Access Purchase') {
    return [
      'You opened a **Priority Access Purchase** ticket.',
      '',
      '**Priority Access Price:** $3 one-time',
      '',
      '**Priority Access Includes:**',
      '• First looks at certain drops',
      '• Faster request handling',
      '• Better chance at limited spots',
      '• Priority Access role',
      '',
      'Wait for the owner/staff to give payment instructions. Do not pay random members.',
    ].join('\n');
  }

  return 'Explain what you need clearly. Add proof, screenshots, links, or details if needed.';
}

async function createForumTicket(interaction, client, type, title) {
  const isStaffReport = type === 'Report Staff';

  const channel = await interaction.guild.channels.create({
    name: makeTicketChannelName(type, interaction.user),
    type: ChannelType.GuildText,
    parent: getTicketParentId(interaction),
    permissionOverwrites: isStaffReport
      ? staffReportPermissions(interaction)
      : normalTicketPermissions(interaction),
    topic: `Ticket Owner: ${interaction.user.id} | Type: ${type}`,
  });

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(config.colors.red)
    .setDescription(getTicketDescription(type))
    .addFields(
      { name: 'Opened By', value: `${interaction.user}`, inline: true },
      { name: 'User ID', value: interaction.user.id, inline: true },
      { name: 'Type', value: type, inline: true }
    )
    .setFooter({ text: 'Cruel Violations Customs' })
    .setTimestamp();

  await channel.send({
    content: isStaffReport
      ? `<@&${config.roles.owner}> <@&${config.roles.administrator}> ${interaction.user}`
      : `<@&${config.roles.staff}> <@&${config.roles.ticketSupport}> ${interaction.user}`,
    embeds: [embed],
    components: [staffButtons()],
  });

  ticketOwners.set(channel.id, interaction.user.id);
  ticketTypesByThread.set(channel.id, type);

  await logInfo(client, 'Ticket Created', `${interaction.user.tag} opened **${type}**.`, [
    { name: 'Channel', value: `${channel}`, inline: true },
  ]);

  return interaction.reply({
    content: `Your ticket was created: ${channel}`,
    ephemeral: true,
  });
}

async function startApplication(interaction, client, type) {
  const meta = getApplicationMeta(type);
  const check = canApplyFor(interaction.member, type);

  if (!check.allowed) {
    return interaction.reply({
      content: check.reason,
      ephemeral: true,
    });
  }

  const existing = db.prepare(`
    SELECT * FROM applications
    WHERE user_id = ? AND status IN ('in_dm', 'submitted', 'accepted_interview')
  `).get(interaction.user.id);

  if (existing) {
    return interaction.reply({
      content: 'You already have an active application. Wait for staff to handle it first.',
      ephemeral: true,
    });
  }

  db.prepare(`
    INSERT OR REPLACE INTO applications
    (user_id, guild_id, thread_id, type, status, current_question, answers, strikes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    interaction.user.id,
    interaction.guild.id,
    null,
    type,
    'in_dm',
    0,
    '[]',
    0,
    Date.now()
  );

  const firstQuestion = meta.questions[0];

  const dmEmbed = new EmbedBuilder()
    .setTitle(meta.title)
    .setColor(config.colors.red)
    .setDescription(
      `Answer each question one at a time. Don’t rush it.\n\nLow effort, fake, or troll answers will get auto denied.`
    )
    .addFields(
      { name: `Question 1/${meta.questions.length}`, value: firstQuestion.text },
      { name: 'How to answer', value: 'Reply to this DM with your answer.' }
    )
    .setFooter({ text: 'Cruel Violations Customs Applications' })
    .setTimestamp();

  const dmSent = await dmUser(client, interaction.user.id, dmEmbed);

  if (!dmSent) {
    db.prepare('DELETE FROM applications WHERE user_id = ?').run(interaction.user.id);

    return interaction.reply({
      content: 'I could not DM you. Turn on DMs from server members and try again.',
      ephemeral: true,
    });
  }

  return interaction.reply({
    content: 'Application started. Check your DMs and answer the questions there.',
    ephemeral: true,
  });
}

async function denyApplicationInDM(message, app, reason) {
  const meta = getApplicationMeta(app.type);

  db.prepare(`
    UPDATE applications
    SET status = 'auto_denied'
    WHERE user_id = ?
  `).run(message.author.id);

  const embed = new EmbedBuilder()
    .setTitle('Application Auto Denied')
    .setColor(config.colors.red)
    .setDescription(
      `Your **${meta.label}** application was denied because your answer didn’t look serious enough.`
    )
    .addFields(
      { name: 'Reason', value: reason },
      { name: 'What now?', value: 'You can reapply, but only if you are actually willing to put effort into the answers.' }
    )
    .setFooter({ text: 'Cruel Violations Customs Applications' })
    .setTimestamp();

  await message.reply({ embeds: [embed] }).catch(() => {});
}

async function submitApplicationToStaff(message, client, app, answers) {
  const meta = getApplicationMeta(app.type);
  const guild = await client.guilds.fetch(app.guild_id).catch(() => null);

  if (!guild) {
    await message.reply('Something went wrong submitting your application. Staff could not be reached.').catch(() => {});
    return;
  }

  const forum = await guild.channels.fetch(config.channels.reportsForum).catch(() => null);

  if (!forum || forum.type !== ChannelType.GuildForum) {
    await message.reply('Something went wrong submitting your application. The staff forum was not found.').catch(() => {});
    return;
  }

  const fields = [
    { name: 'Applicant', value: `${message.author}`, inline: true },
    { name: 'User ID', value: message.author.id, inline: true },
    { name: 'Position', value: meta.label, inline: true },
  ];

  for (const item of answers) {
    fields.push({
      name: item.question.slice(0, 256),
      value: item.answer.slice(0, 1024),
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(meta.title)
    .setColor(config.colors.red)
    .setDescription('New completed staff application.')
    .addFields(fields.slice(0, 25))
    .setTimestamp();

  const thread = await forum.threads.create({
    name: `${meta.label} App - ${message.author.username}`.slice(0, 90),
    message: {
      content: `<@&${config.roles.staff}>`,
      embeds: [embed],
      components: [staffButtons()],
    },
  });

  ticketOwners.set(thread.id, message.author.id);
  ticketTypesByThread.set(thread.id, `Application:${app.type}`);

  db.prepare(`
    UPDATE applications
    SET status = 'submitted', thread_id = ?
    WHERE user_id = ?
  `).run(thread.id, message.author.id);

  await logInfo(client, 'Staff Application Submitted', `${message.author.tag} submitted a **${meta.label}** application.`, [
    { name: 'Thread', value: `${thread}`, inline: true },
  ]);

  const doneEmbed = new EmbedBuilder()
    .setTitle('Application Submitted')
    .setColor(config.colors.green)
    .setDescription('Your application was sent to staff. They will review it when they can.')
    .addFields(
      { name: 'Position', value: meta.label },
      { name: 'Note', value: 'Do not spam staff asking them to review it.' }
    )
    .setFooter({ text: 'Cruel Violations Customs Applications' })
    .setTimestamp();

  await message.reply({ embeds: [doneEmbed] }).catch(() => {});
}

async function handleApplicationDM(message, client) {
  const app = db.prepare(`
    SELECT * FROM applications
    WHERE user_id = ? AND status = 'in_dm'
  `).get(message.author.id);

  if (!app) return;

  const meta = getApplicationMeta(app.type);

  if (!meta) return;

  const currentQuestion = app.current_question || 0;
  const question = meta.questions[currentQuestion];

  if (!question) return;

  const answer = message.content?.trim();

  if (!answer) {
    await denyApplicationInDM(message, app, 'You did not send a real answer.');
    return;
  }

  const check = isLowEffortAnswer(answer, question, meta);

  if (check.bad) {
    await denyApplicationInDM(message, app, check.reason);
    return;
  }

  const answers = parseAnswers(app.answers);

  answers.push({
    question: question.text,
    answer,
  });

  const nextQuestionIndex = currentQuestion + 1;

  if (nextQuestionIndex >= meta.questions.length) {
    db.prepare(`
      UPDATE applications
      SET answers = ?, current_question = ?
      WHERE user_id = ?
    `).run(JSON.stringify(answers), nextQuestionIndex, message.author.id);

    await submitApplicationToStaff(message, client, app, answers);
    return;
  }

  db.prepare(`
    UPDATE applications
    SET answers = ?, current_question = ?
    WHERE user_id = ?
  `).run(JSON.stringify(answers), nextQuestionIndex, message.author.id);

  const nextQuestion = meta.questions[nextQuestionIndex];

  const embed = new EmbedBuilder()
    .setTitle(meta.title)
    .setColor(config.colors.red)
    .addFields(
      { name: `Question ${nextQuestionIndex + 1}/${meta.questions.length}`, value: nextQuestion.text }
    )
    .setFooter({ text: 'Answer this question in your next message.' })
    .setTimestamp();

  await message.reply({ embeds: [embed] }).catch(() => {});
}

async function handleAcceptedApplication(interaction, client, ownerId, appType) {
  const type = appType.replace('Application:', '');
  const meta = getApplicationMeta(type);

  if (!meta) return false;

  const member = await interaction.guild.members.fetch(ownerId).catch(() => null);

  if (member && meta.interviewRole) {
    await member.roles.add(meta.interviewRole).catch(() => {});
  }

  db.prepare(`
    UPDATE applications
    SET status = 'accepted_interview'
    WHERE user_id = ?
  `).run(ownerId);

  const acceptedChannel = await interaction.guild.channels
    .fetch(config.channels.acceptedApplications)
    .catch(() => null);

  const embed = new EmbedBuilder()
    .setTitle('Application Accepted For Interview')
    .setColor(config.colors.green)
    .addFields(
      { name: 'Applicant', value: `<@${ownerId}>`, inline: true },
      { name: 'Position', value: meta.label, inline: true },
      { name: 'Accepted By', value: `${interaction.user}`, inline: true },
      { name: 'Application Thread', value: `${interaction.channel}` },
      { name: 'Status', value: 'Waiting for interview / final decision.' }
    )
    .setFooter({ text: 'Accept does not mean fully hired yet.' })
    .setTimestamp();

  if (acceptedChannel) {
    await acceptedChannel.send({
      content: `<@${ownerId}>`,
      embeds: [embed],
    }).catch(() => {});
  }

  const dmEmbed = new EmbedBuilder()
    .setTitle('Application Accepted For Interview')
    .setColor(config.colors.green)
    .setDescription(
      `Your **${meta.label}** application was accepted for an interview.\n\nThis does **not** mean you have the role yet. Staff will contact you soon with the next steps.`
    )
    .addFields(
      { name: 'Accepted By', value: `${interaction.user.tag}` },
      { name: 'Next Step', value: 'Wait for staff to setup your interview.' }
    )
    .setTimestamp();

  await dmUser(client, ownerId, dmEmbed);

  return true;
}

async function getThreadOwnerAndType(channelId) {
  let ownerId = ticketOwners.get(channelId);
  let threadType = ticketTypesByThread.get(channelId);

  if (!ownerId || !threadType) {
    const app = db.prepare('SELECT * FROM applications WHERE thread_id = ?').get(channelId);

    if (app) {
      ownerId = app.user_id;
      threadType = `Application:${app.type}`;
    }
  }

  return { ownerId, threadType };
}

async function handleTicketButton(interaction, client) {
  const id = interaction.customId;

  const ticketTypes = {
    ticket_general: ['General Support', 'Support Ticket'],
    ticket_car: ['Car Help', 'Car Help Ticket'],
    ticket_vip_purchase: ['VIP Purchase', 'VIP Purchase Ticket'],
    ticket_priority_purchase: ['Priority Access Purchase', 'Priority Access Purchase Ticket'],
    ticket_other: ['Other Help', 'Other Ticket'],

    report_member: ['Report Member', 'Member Report'],
    report_staff: ['Report Staff', 'Staff Report'],
    report_scam: ['Report Scam / Fake Listing', 'Scam Report'],
  };

  if (ticketTypes[id]) {
    const [type, title] = ticketTypes[id];
    return createForumTicket(interaction, client, type, title);
  }

  if (id === 'apply_support') {
    return startApplication(interaction, client, 'support');
  }

  if (id === 'apply_mod') {
    return startApplication(interaction, client, 'mod');
  }

  if (id === 'apply_admin') {
    return startApplication(interaction, client, 'admin');
  }

  if (!['ticket_claim', 'ticket_accept', 'ticket_deny', 'ticket_close'].includes(id)) return;

  if (!canUseTicketTools(interaction.member)) {
    return interaction.reply({
      content: 'Only staff or Ticket Support can use this button.',
      ephemeral: true,
    });
  }

  if (id === 'ticket_claim') {
    return interaction.reply(`Claimed by ${interaction.user}.`);
  }

  if (id === 'ticket_accept') {
    const { ownerId, threadType } = await getThreadOwnerAndType(interaction.channel.id);

    if (ownerId && threadType?.startsWith('Application:')) {
      await handleAcceptedApplication(interaction, client, ownerId, threadType);
      return interaction.reply(`Accepted for interview by ${interaction.user}.`);
    }

    if (ownerId) {
      const dmEmbed = new EmbedBuilder()
        .setTitle('Ticket Accepted')
        .setColor(config.colors.green)
        .setDescription('Your ticket was accepted and is being handled.')
        .addFields({ name: 'Handled By', value: `${interaction.user.tag}` })
        .setTimestamp();

      await dmUser(client, ownerId, dmEmbed);
    }

    return interaction.reply(`Accepted by ${interaction.user}.`);
  }

  if (id === 'ticket_deny') {
    const modal = new ModalBuilder()
      .setCustomId(`ticket_deny_modal:${interaction.channel.id}`)
      .setTitle('Deny Ticket / Application');

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for denial')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

    return interaction.showModal(modal);
  }

  if (id === 'ticket_close') {
    const modal = new ModalBuilder()
      .setCustomId(`ticket_close_modal:${interaction.channel.id}`)
      .setTitle('Close Ticket / Application');

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason for closing')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1000);

    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

    return interaction.showModal(modal);
  }
}

async function handleTicketModal(interaction, client) {
  if (!interaction.customId.startsWith('ticket_deny_modal') && !interaction.customId.startsWith('ticket_close_modal')) return;

  if (!canUseTicketTools(interaction.member)) {
    return interaction.reply({
      content: 'Only staff or Ticket Support can use this.',
      ephemeral: true,
    });
  }

  const [modalType, channelId] = interaction.customId.split(':');
  const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided.';
  const { ownerId, threadType } = await getThreadOwnerAndType(channelId);

  if (modalType === 'ticket_deny_modal') {
    if (ownerId) {
      const dmEmbed = new EmbedBuilder()
        .setTitle('Denied')
        .setColor(config.colors.red)
        .setDescription('Your ticket/application was denied.')
        .addFields(
          { name: 'Denied By', value: `${interaction.user.tag}` },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await dmUser(client, ownerId, dmEmbed);
    }

    if (threadType?.startsWith('Application:')) {
      db.prepare(`
        UPDATE applications
        SET status = 'denied'
        WHERE thread_id = ?
      `).run(channelId);
    }

    await interaction.reply(`Denied by ${interaction.user}.\nReason: ${reason}`);
  }

  if (modalType === 'ticket_close_modal') {
    if (ownerId) {
      const dmEmbed = new EmbedBuilder()
        .setTitle('Closed')
        .setColor(config.colors.yellow)
        .setDescription('Your ticket/application was closed.')
        .addFields(
          { name: 'Closed By', value: `${interaction.user.tag}` },
          { name: 'Reason', value: reason }
        )
        .setTimestamp();

      await dmUser(client, ownerId, dmEmbed);
    }

    if (threadType?.startsWith('Application:')) {
      db.prepare(`
        UPDATE applications
        SET status = 'closed'
        WHERE thread_id = ?
      `).run(channelId);
    }

    await interaction.reply(`Closed by ${interaction.user}.\nReason: ${reason}`);

    if (interaction.channel?.isThread?.()) {
      if (interaction.channel.setLocked) {
        await interaction.channel.setLocked(true).catch(() => {});
      }

      if (interaction.channel.setArchived) {
        await interaction.channel.setArchived(true).catch(() => {});
      }
    } else {
      if (ownerId) {
        await interaction.channel.permissionOverwrites.edit(ownerId, {
          SendMessages: false,
          AttachFiles: false,
          EmbedLinks: false,
        }).catch(() => {});
      }

      await interaction.channel.setName(`closed-${interaction.channel.name}`.slice(0, 90)).catch(() => {});
    }
  }

  await logInfo(client, 'Ticket Updated', `${interaction.user.tag} used ${modalType}.`, [
    { name: 'Channel', value: `${interaction.channel}`, inline: true },
    { name: 'Reason', value: reason },
  ]);
}

module.exports = {
  ticketPanelEmbed,
  reportPanelEmbed,
  applicationPanelEmbed,
  ticketButtons,
  reportButtons,
  applicationButtons,
  handleTicketButton,
  handleTicketModal,
  handleApplicationDM,
};