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
    created_at INTEGER NOT NULL
  )
`).run();

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some(col => col.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

ensureColumn('applications', 'thread_id', 'TEXT');
ensureColumn('applications', 'current_question', 'INTEGER DEFAULT 0');
ensureColumn('applications', 'answers', "TEXT DEFAULT '[]'");

const ticketOwners = new Map();
const ticketTypesByChannel = new Map();

function baseEmbed(title, desc) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(config.colors.darkRed || config.colors.red)
    .setDescription(desc)
    .setFooter({ text: 'skid • /ritual' })
    .setTimestamp();
}

function ticketPanelEmbed() {
  return baseEmbed('Tickets', 'Open what you need below. Keep it simple, give details, and do not spam staff.')
    .addFields(
      { name: 'General Support', value: 'server help, roles, questions, or basic support.' },
      { name: 'Reports', value: 'report a member, staff issue, or something that needs proof.' },
      { name: 'Special Roles', value: 'Obsidian, Ascendant, custom role, or private channel purchases.' },
      { name: 'Other', value: 'anything that does not fit above.' },
    );
}

function reportPanelEmbed() {
  return baseEmbed('Reports', 'Use this if something actually needs staff.')
    .addFields(
      { name: 'Report Member', value: 'report a member with proof.' },
      { name: 'Report Staff', value: 'staff reports go to high staff only.' },
      { name: 'Other Report', value: 'anything serious that does not fit.' },
    );
}

function applicationPanelEmbed() {
  return baseEmbed('Applications', 'Apply if you actually want to help. The bot will DM you one question at a time.')
    .addFields(
      { name: 'Support', value: 'Level 0+ • tickets/support.' },
      { name: 'Enforcer', value: 'Level 5+ • moderation.' },
      { name: 'Warden', value: 'Level 10+ • higher trust/admin.' },
    );
}

function ticketButtons() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_general').setLabel('General Support').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ticket_report').setLabel('Report').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_special_roles').setLabel('Special Roles').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ticket_other').setLabel('Other').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function reportButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('report_member').setLabel('Report Member').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('report_staff').setLabel('Report Staff').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('report_other').setLabel('Other Report').setStyle(ButtonStyle.Danger),
  );
}

function applicationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('apply_support').setLabel('Apply Support').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('apply_enforcer').setLabel('Apply Enforcer').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('apply_warden').setLabel('Apply Warden').setStyle(ButtonStyle.Danger),
  );
}

function staffButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_deny').setLabel('Deny').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Secondary),
  );
}

function appMeta(type) {
  return {
    support: {
      title: 'Support Application',
      label: 'Support',
      requiredLevel: 0,
      minAge: 14,
      interviewRole: config.roles.awaitingSupportInterview,
      questions: [
        ['age', 'How old are you?', 1, 'age'],
        ['timezone', 'What timezone are you in and when are you usually active?', 8],
        ['why', 'Why do you want Support?', 25],
        ['ticket', 'Someone opens a ticket and says “help”. What do you do?', 35],
        ['attitude', 'How do you handle someone being rude in a ticket?', 35],
        ['experience', 'Any past support/staff experience? If not, what makes you useful?', 25],
      ],
    },
    enforcer: {
      title: 'Enforcer Application',
      label: 'Enforcer',
      requiredLevel: 5,
      minAge: 15,
      interviewRole: config.roles.awaitingEnforcerInterview,
      questions: [
        ['age', 'How old are you?', 1, 'age'],
        ['timezone', 'What timezone are you in and when are you usually active?', 8],
        ['mic', 'Do you have a working mic?', 2, 'mic'],
        ['why', 'Why do you want Enforcer?', 30],
        ['argument', 'Two members start arguing in chat. What do you do?', 40],
        ['friend', 'Your friend breaks a rule and expects you to ignore it. What do you do?', 35],
        ['mistake', 'What would you do if you made the wrong staff call?', 35],
      ],
    },
    warden: {
      title: 'Warden Application',
      label: 'Warden',
      requiredLevel: 10,
      minAge: 16,
      interviewRole: config.roles.awaitingWardenInterview,
      questions: [
        ['age', 'How old are you?', 1, 'age'],
        ['timezone', 'What timezone are you in and when are you usually active?', 8],
        ['mic', 'Do you have a working mic?', 2, 'mic'],
        ['why', 'Why do you want Warden?', 40],
        ['trust', 'Why should we trust you with higher permissions?', 45],
        ['abuse', 'How would you handle staff abusing power?', 45],
        ['serious', 'When is a ban actually needed?', 40],
      ],
    },
  }[type];
}

function checkAppLevel(member, type) {
  const meta = appMeta(type);
  if (!meta) return { ok: false, reason: 'invalid application.' };
  const profile = getProfile(member.guild.id, member.id);
  if (profile.level < meta.requiredLevel) {
    return { ok: false, reason: `You need **Level ${meta.requiredLevel}** to apply for **${meta.label}**. You are **Level ${profile.level}**.` };
  }
  return { ok: true };
}

function parseAnswers(raw) {
  try { return JSON.parse(raw || '[]') || []; } catch { return []; }
}

function lowEffort(answer, q, meta) {
  const text = answer.toLowerCase().replace(/\s+/g, ' ').trim();
  if (['idk','i dont know',"i don't know",'no','yes','nah','yeah','ok','okay','n/a','none','nothing','.', '..','...','asdf','lol','lmao'].includes(text)) {
    return 'your answer looked lazy/fake.';
  }
  if (/(.)\1{6,}/.test(text)) return 'your answer looked like spam.';
  if (q[3] === 'age') {
    const age = parseInt(text.match(/\d+/)?.[0], 10);
    if (!age || age < meta.minAge || age > 60) return `you must be at least **${meta.minAge}**.`;
    return null;
  }
  if (q[3] === 'mic') return null;
  if (text.length < q[2]) return 'your answer was too short.';
  if (q[2] >= 25 && text.split(' ').filter(Boolean).length < 5) return 'explain more. one-liners are not enough.';
  return null;
}

async function dmUser(client, id, embed, content = null) {
  const user = await client.users.fetch(id).catch(() => null);
  if (!user) return false;
  return user.send({ content, embeds: [embed] }).then(() => true).catch(() => false);
}

function ticketPerms(interaction, staffOnly = false) {
  const base = [
    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks],
    },
  ];

  if (staffOnly) {
    base.push(
      { id: config.roles.owner, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] },
      { id: config.roles.warden, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] },
    );
  } else {
    base.push(
      { id: config.roles.staff, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] },
      { id: config.roles.support, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ManageMessages] },
    );
  }

  return base;
}

function ticketInfo(type) {
  if (type === 'Special Roles') {
    return [
      'Tell staff what you want to buy:',
      '',
      '**Obsidian** — high status role / private chat / higher placement',
      '**Ascendant** — lower paid status role / priority support',
      '**Custom Role** — choose role name and color',
      '**Private Channel** — your own channel inside the private category',
      '',
      'Only pay through the owner/approved Stripe link.',
    ].join('\n');
  }

  if (type === 'Report Staff') return 'Explain the issue clearly. Only high staff can see this. Add proof if you have it.';

  return 'Explain what you need clearly. Add screenshots, links, or proof if needed.';
}

async function createTicket(interaction, client, type, title) {
  const staffOnly = type === 'Report Staff';
  const name = `${type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${interaction.user.username}`.slice(0, 90);

  const channel = await interaction.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: interaction.channel?.parentId || null,
    permissionOverwrites: ticketPerms(interaction, staffOnly),
    topic: `Ticket Owner: ${interaction.user.id} | Type: ${type}`,
  });

  const message = await channel.send({
    content: staffOnly ? `<@&${config.roles.owner}> <@&${config.roles.warden}> ${interaction.user}` : `<@&${config.roles.staff}> <@&${config.roles.support}> ${interaction.user}`,
    embeds: [baseEmbed(title, ticketInfo(type)).addFields(
      { name: 'Opened By', value: `${interaction.user}`, inline: true },
      { name: 'Type', value: type, inline: true },
    )],
    components: [staffButtons()],
  });

  ticketOwners.set(channel.id, interaction.user.id);
  ticketTypesByChannel.set(channel.id, type);
  await logInfo(client, 'Ticket Created', `${interaction.user.tag} opened **${type}**.`, [{ name: 'Channel', value: `${channel}`, inline: true }]);

  return interaction.reply({ content: `Created: ${channel}`, ephemeral: true });
}

async function startApplication(interaction, client, type) {
  const meta = appMeta(type);
  const check = checkAppLevel(interaction.member, type);
  if (!check.ok) return interaction.reply({ content: check.reason, ephemeral: true });

  const active = db.prepare(`
    SELECT * FROM applications WHERE user_id = ? AND status IN ('in_dm','submitted','accepted_interview')
  `).get(interaction.user.id);

  if (active) return interaction.reply({ content: 'You already have an active application.', ephemeral: true });

  db.prepare(`
    INSERT OR REPLACE INTO applications (user_id, guild_id, thread_id, type, status, current_question, answers, created_at)
    VALUES (?, ?, NULL, ?, 'in_dm', 0, '[]', ?)
  `).run(interaction.user.id, interaction.guild.id, type, Date.now());

  const q = meta.questions[0];
  const sent = await dmUser(client, interaction.user.id,
    baseEmbed(meta.title, 'Answer each question one at a time. Low effort answers get denied.')
      .addFields({ name: `Question 1/${meta.questions.length}`, value: q[1] })
  );

  if (!sent) {
    db.prepare('DELETE FROM applications WHERE user_id = ?').run(interaction.user.id);
    return interaction.reply({ content: 'I could not DM you. Turn on DMs and try again.', ephemeral: true });
  }

  return interaction.reply({ content: 'Application started. Check your DMs.', ephemeral: true });
}

async function handleApplicationDM(message, client) {
  const app = db.prepare(`SELECT * FROM applications WHERE user_id = ? AND status = 'in_dm'`).get(message.author.id);
  if (!app) return;

  const meta = appMeta(app.type);
  if (!meta) return;

  const index = app.current_question || 0;
  const q = meta.questions[index];
  const answer = message.content?.trim();

  const bad = lowEffort(answer || '', q, meta);
  if (bad) {
    db.prepare(`UPDATE applications SET status = 'auto_denied' WHERE user_id = ?`).run(message.author.id);
    return message.reply({
      embeds: [baseEmbed('Application Denied', `Your answer was denied because ${bad}\n\nYou can reapply when you are ready to actually answer properly.`)],
    }).catch(() => {});
  }

  const answers = parseAnswers(app.answers);
  answers.push({ question: q[1], answer });

  const next = index + 1;
  db.prepare(`UPDATE applications SET answers = ?, current_question = ? WHERE user_id = ?`).run(JSON.stringify(answers), next, message.author.id);

  if (next < meta.questions.length) {
    return message.reply({
      embeds: [baseEmbed(meta.title, 'Next question.')
        .addFields({ name: `Question ${next + 1}/${meta.questions.length}`, value: meta.questions[next][1] })],
    }).catch(() => {});
  }

  const guild = await client.guilds.fetch(app.guild_id).catch(() => null);
  const forum = await guild?.channels.fetch(config.channels.reportsForum).catch(() => null);

  if (!forum || forum.type !== ChannelType.GuildForum) {
    return message.reply('Application finished, but staff forum was not found. Tell staff.').catch(() => {});
  }

  const fields = [
    { name: 'Applicant', value: `${message.author}`, inline: true },
    { name: 'Position', value: meta.label, inline: true },
    ...answers.map(a => ({ name: a.question.slice(0, 256), value: a.answer.slice(0, 1024) })),
  ];

  const thread = await forum.threads.create({
    name: `${meta.label} App - ${message.author.username}`.slice(0, 90),
    message: {
      content: `<@&${config.roles.staff}>`,
      embeds: [baseEmbed(meta.title, 'New completed staff application.').addFields(fields.slice(0, 25))],
      components: [staffButtons()],
    },
  });

  db.prepare(`UPDATE applications SET status = 'submitted', thread_id = ? WHERE user_id = ?`).run(thread.id, message.author.id);
  ticketOwners.set(thread.id, message.author.id);
  ticketTypesByChannel.set(thread.id, `Application:${app.type}`);

  return message.reply({ embeds: [baseEmbed('Application Submitted', 'Your application was sent to staff. Do not spam them asking for a review.')] }).catch(() => {});
}

async function getOwnerAndType(channelId) {
  let ownerId = ticketOwners.get(channelId);
  let type = ticketTypesByChannel.get(channelId);

  if (!ownerId || !type) {
    const app = db.prepare('SELECT * FROM applications WHERE thread_id = ?').get(channelId);
    if (app) {
      ownerId = app.user_id;
      type = `Application:${app.type}`;
    }
  }

  return { ownerId, type };
}

async function acceptApplication(interaction, client, ownerId, appType) {
  const type = appType.replace('Application:', '');
  const meta = appMeta(type);
  const member = await interaction.guild.members.fetch(ownerId).catch(() => null);
  if (member && meta.interviewRole) await member.roles.add(meta.interviewRole).catch(() => {});

  db.prepare(`UPDATE applications SET status = 'accepted_interview' WHERE user_id = ?`).run(ownerId);

  const accepted = await interaction.guild.channels.fetch(config.channels.acceptedApplications).catch(() => null);
  if (accepted) {
    await accepted.send({
      content: `<@${ownerId}>`,
      embeds: [baseEmbed('Accepted For Interview', 'Application moved to interview stage.')
        .addFields(
          { name: 'Applicant', value: `<@${ownerId}>`, inline: true },
          { name: 'Role', value: meta.label, inline: true },
          { name: 'Accepted By', value: `${interaction.user}`, inline: true },
          { name: 'Application', value: `${interaction.channel}` },
        )],
    }).catch(() => {});
  }

  await dmUser(client, ownerId, baseEmbed('Accepted For Interview', `Your **${meta.label}** application was accepted for interview. This does not mean you are staff yet.`));
}

async function handleTicketButton(interaction, client) {
  const id = interaction.customId;

  const map = {
    ticket_general: ['General Support', 'Support Ticket'],
    ticket_report: ['Report Member', 'Report Ticket'],
    ticket_special_roles: ['Special Roles', 'Special Roles Ticket'],
    ticket_other: ['Other', 'Other Ticket'],
    report_member: ['Report Member', 'Member Report'],
    report_staff: ['Report Staff', 'Staff Report'],
    report_other: ['Other Report', 'Other Report'],
  };

  if (map[id]) {
    const [type, title] = map[id];
    return createTicket(interaction, client, type, title);
  }

  if (id === 'apply_support') return startApplication(interaction, client, 'support');
  if (id === 'apply_enforcer') return startApplication(interaction, client, 'enforcer');
  if (id === 'apply_warden') return startApplication(interaction, client, 'warden');

  if (!['ticket_claim', 'ticket_accept', 'ticket_deny', 'ticket_close'].includes(id)) return;

  if (!canUseTicketTools(interaction.member)) {
    return interaction.reply({ content: 'Only staff/support can use this.', ephemeral: true });
  }

  if (id === 'ticket_claim') return interaction.reply(`Claimed by ${interaction.user}.`);

  if (id === 'ticket_accept') {
    const { ownerId, type } = await getOwnerAndType(interaction.channel.id);
    if (ownerId && type?.startsWith('Application:')) {
      await acceptApplication(interaction, client, ownerId, type);
      return interaction.reply(`Accepted for interview by ${interaction.user}.`);
    }
    if (ownerId) await dmUser(client, ownerId, baseEmbed('Ticket Accepted', `Your ticket was accepted by **${interaction.user.tag}**.`));
    return interaction.reply(`Accepted by ${interaction.user}.`);
  }

  const modal = new ModalBuilder()
    .setCustomId(`${id === 'ticket_deny' ? 'ticket_deny_modal' : 'ticket_close_modal'}:${interaction.channel.id}`)
    .setTitle(id === 'ticket_deny' ? 'Deny' : 'Close');

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(id === 'ticket_deny')
      .setMaxLength(1000),
  ));

  return interaction.showModal(modal);
}

async function handleTicketModal(interaction, client) {
  if (!interaction.customId.startsWith('ticket_deny_modal') && !interaction.customId.startsWith('ticket_close_modal')) return;

  if (!canUseTicketTools(interaction.member)) {
    return interaction.reply({ content: 'Only staff/support can use this.', ephemeral: true });
  }

  const [modalType, channelId] = interaction.customId.split(':');
  const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided.';
  const { ownerId, type } = await getOwnerAndType(channelId);

  if (ownerId) {
    await dmUser(client, ownerId, baseEmbed(modalType.includes('deny') ? 'Denied' : 'Closed', `Handled by **${interaction.user.tag}**.\n\nReason: ${reason}`));
  }

  if (type?.startsWith('Application:')) {
    db.prepare(`UPDATE applications SET status = ? WHERE thread_id = ?`).run(modalType.includes('deny') ? 'denied' : 'closed', channelId);
  }

  await interaction.reply(`${modalType.includes('deny') ? 'Denied' : 'Closed'} by ${interaction.user}.\nReason: ${reason}`);

  if (modalType.includes('close')) {
    if (interaction.channel?.isThread?.()) {
      await interaction.channel.setLocked?.(true).catch(() => {});
      await interaction.channel.setArchived?.(true).catch(() => {});
    } else {
      if (ownerId) {
        await interaction.channel.permissionOverwrites.edit(ownerId, { SendMessages: false, AttachFiles: false, EmbedLinks: false }).catch(() => {});
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
