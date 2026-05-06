const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const config = require('../config');
const { canUseTicketTools, isOwner } = require('./permissions');
const { getProfile } = require('./levels');
const { logInfo } = require('./logger');

const ticketOwners = new Map();
const ticketTypesByThread = new Map();

function ticketPanelEmbed() {
  return new EmbedBuilder()
    .setTitle('Open A Ticket')
    .setColor(config.colors.red)
    .setDescription('Pick what you need help with below.')
    .addFields(
      { name: 'General Support', value: 'Basic help, server help, random questions.' },
      { name: 'Car Help', value: 'Cars, drops, meets, requests, all that.' },
      { name: 'VIP Help', value: 'VIP stuff, access issues, priority help.' },
      { name: 'Other', value: 'If it doesnt fit the others, use this one.' }
    )
    .setFooter({ text: 'Cruel Violations Customs' });
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
    .setDescription('Apply below if you actually want to help the server. Don’t troll apps.')
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
    .setFooter({ text: 'Accept = accepted for interview, not instantly hired.' });
}

function ticketButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_general')
      .setLabel('General Support')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('ticket_car')
      .setLabel('Car Help')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_vip')
      .setLabel('VIP Help')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('ticket_other')
      .setLabel('Other')
      .setStyle(ButtonStyle.Secondary)
  );
}

function reportButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('report_member')
      .setLabel('Report Member')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('report_staff')
      .setLabel('Report Staff')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('report_scam')
      .setLabel('Scam / Fake Listing')
      .setStyle(ButtonStyle.Danger)
  );
}

function applicationButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('apply_support')
      .setLabel('Apply Ticket Support')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('apply_mod')
      .setLabel('Apply Moderator')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('apply_admin')
      .setLabel('Apply Administrator')
      .setStyle(ButtonStyle.Danger)
  );
}

function staffButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('Claim')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('ticket_accept')
      .setLabel('Accept')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('ticket_deny')
      .setLabel('Deny')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Close')
      .setStyle(ButtonStyle.Secondary)
  );
}

function getApplicationMeta(type) {
  const data = {
    support: {
      title: 'Ticket Support Application',
      label: 'Ticket Support',
      interviewRole: config.roles.awaitingSupportInterview,
      requiredLevel: 0,
    },
    mod: {
      title: 'Moderator Application',
      label: 'Moderator',
      interviewRole: config.roles.awaitingModInterview,
      requiredLevel: 5,
    },
    admin: {
      title: 'Administrator Application',
      label: 'Administrator',
      interviewRole: config.roles.awaitingAdminInterview,
      requiredLevel: 10,
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

  if (isOwner(member)) {
    return { allowed: true };
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

function makeApplicationModal(type) {
  const meta = getApplicationMeta(type);

  const modal = new ModalBuilder()
    .setCustomId(`application_modal:${type}`)
    .setTitle(meta.title);

  const age = new TextInputBuilder()
    .setCustomId('age')
    .setLabel('Age')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(20);

  const timezone = new TextInputBuilder()
    .setCustomId('timezone')
    .setLabel('Timezone / active times')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const experience = new TextInputBuilder()
    .setCustomId('experience')
    .setLabel('Any past experience?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const why = new TextInputBuilder()
    .setCustomId('why')
    .setLabel('Why do you want this role?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const extra = new TextInputBuilder()
    .setCustomId('extra')
    .setLabel('Tell us about you / how you handle people')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder().addComponents(age),
    new ActionRowBuilder().addComponents(timezone),
    new ActionRowBuilder().addComponents(experience),
    new ActionRowBuilder().addComponents(why),
    new ActionRowBuilder().addComponents(extra)
  );

  return modal;
}

async function dmUser(client, userId, embed) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return false;

  await user.send({ embeds: [embed] }).catch(() => null);
  return true;
}

async function createForumTicket(interaction, client, type, title) {
  const forum = await interaction.guild.channels.fetch(config.channels.reportsForum).catch(() => null);

  if (!forum || forum.type !== ChannelType.GuildForum) {
    return interaction.reply({
      content: 'Reports forum was not found or is not a forum channel.',
      ephemeral: true,
    });
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(config.colors.red)
    .setDescription('Staff will get to this when they can. Explain everything clearly and include proof if needed.')
    .addFields(
      { name: 'Opened By', value: `${interaction.user}`, inline: true },
      { name: 'User ID', value: interaction.user.id, inline: true },
      { name: 'Type', value: type, inline: true }
    )
    .setTimestamp();

  const thread = await forum.threads.create({
    name: `${type} - ${interaction.user.username}`.slice(0, 90),
    message: {
      content: `<@&${config.roles.staff}> <@&${config.roles.ticketSupport}> ${interaction.user}`,
      embeds: [embed],
      components: [staffButtons()],
    },
  });

  ticketOwners.set(thread.id, interaction.user.id);
  ticketTypesByThread.set(thread.id, type);

  await logInfo(client, 'Ticket Created', `${interaction.user.tag} opened **${type}**.`, [
    { name: 'Thread', value: `${thread}`, inline: true },
  ]);

  return interaction.reply({
    content: `Your ticket was created: ${thread}`,
    ephemeral: true,
  });
}

async function createApplicationPost(interaction, client, type) {
  const meta = getApplicationMeta(type);
  const forum = await interaction.guild.channels.fetch(config.channels.reportsForum).catch(() => null);

  if (!forum || forum.type !== ChannelType.GuildForum) {
    return interaction.reply({
      content: 'Reports forum was not found or is not a forum channel.',
      ephemeral: true,
    });
  }

  const age = interaction.fields.getTextInputValue('age');
  const timezone = interaction.fields.getTextInputValue('timezone');
  const experience = interaction.fields.getTextInputValue('experience');
  const why = interaction.fields.getTextInputValue('why');
  const extra = interaction.fields.getTextInputValue('extra');

  const embed = new EmbedBuilder()
    .setTitle(meta.title)
    .setColor(config.colors.red)
    .setDescription(`New ${meta.label.toLowerCase()} application.`)
    .addFields(
      { name: 'Applicant', value: `${interaction.user}`, inline: true },
      { name: 'User ID', value: interaction.user.id, inline: true },
      { name: 'Age', value: age, inline: true },
      { name: 'Timezone / Active Times', value: timezone },
      { name: 'Experience', value: experience },
      { name: 'Why do they want it?', value: why },
      { name: 'Extra', value: extra }
    )
    .setTimestamp();

  const thread = await forum.threads.create({
    name: `${meta.label} App - ${interaction.user.username}`.slice(0, 90),
    message: {
      content: `<@&${config.roles.staff}> <@&${config.roles.ticketSupport}>`,
      embeds: [embed],
      components: [staffButtons()],
    },
  });

  ticketOwners.set(thread.id, interaction.user.id);
  ticketTypesByThread.set(thread.id, `Application:${type}`);

  await logInfo(client, 'Staff Application Created', `${interaction.user.tag} submitted a **${meta.label}** application.`, [
    { name: 'Thread', value: `${thread}`, inline: true },
  ]);

  return interaction.reply({
    content: `Your application was sent: ${thread}`,
    ephemeral: true,
  });
}

async function handleAcceptedApplication(interaction, client, ownerId, appType) {
  const type = appType.replace('Application:', '');
  const meta = getApplicationMeta(type);

  if (!meta) {
    return false;
  }

  const member = await interaction.guild.members.fetch(ownerId).catch(() => null);

  if (member && meta.interviewRole) {
    await member.roles.add(meta.interviewRole).catch(() => {});
  }

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

async function handleTicketButton(interaction, client) {
  const id = interaction.customId;

  const ticketTypes = {
    ticket_general: ['General Support', 'Support Ticket'],
    ticket_car: ['Car Help', 'Car Help Ticket'],
    ticket_vip: ['VIP Help', 'VIP Ticket'],
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
    const check = canApplyFor(interaction.member, 'support');

    if (!check.allowed) {
      return interaction.reply({
        content: check.reason,
        ephemeral: true,
      });
    }

    return interaction.showModal(makeApplicationModal('support'));
  }

  if (id === 'apply_mod') {
    const check = canApplyFor(interaction.member, 'mod');

    if (!check.allowed) {
      return interaction.reply({
        content: check.reason,
        ephemeral: true,
      });
    }

    return interaction.showModal(makeApplicationModal('mod'));
  }

  if (id === 'apply_admin') {
    const check = canApplyFor(interaction.member, 'admin');

    if (!check.allowed) {
      return interaction.reply({
        content: check.reason,
        ephemeral: true,
      });
    }

    return interaction.showModal(makeApplicationModal('admin'));
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
    const ownerId = ticketOwners.get(interaction.channel.id);
    const threadType = ticketTypesByThread.get(interaction.channel.id);

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
  if (interaction.customId.startsWith('application_modal:')) {
    const type = interaction.customId.split(':')[1];
    return createApplicationPost(interaction, client, type);
  }

  if (!interaction.customId.startsWith('ticket_deny_modal') && !interaction.customId.startsWith('ticket_close_modal')) return;

  if (!canUseTicketTools(interaction.member)) {
    return interaction.reply({
      content: 'Only staff or Ticket Support can use this.',
      ephemeral: true,
    });
  }

  const [modalType, channelId] = interaction.customId.split(':');
  const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided.';
  const ownerId = ticketOwners.get(channelId);

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

    await interaction.reply(`Closed by ${interaction.user}.\nReason: ${reason}`);

    if (interaction.channel?.setLocked) {
      await interaction.channel.setLocked(true).catch(() => {});
    }

    if (interaction.channel?.setArchived) {
      await interaction.channel.setArchived(true).catch(() => {});
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
};