const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { updateCounters } = require('../systems/counters');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member, client) {
    if (!member || member.user.bot) return;

    if (config.roles.member) {
      await member.roles.add(config.roles.member).catch(error => {
        console.log(`[WELCOME] Could not give Initiate to ${member.user.tag}: ${error.message}`);
      });
    }

    const welcomeChannel = await member.guild.channels
      .fetch(config.channels.welcome)
      .catch(() => null);

    if (!welcomeChannel) {
      console.log('[WELCOME] Welcome channel not found.');
      return;
    }

    const memberNumber = member.guild.memberCount || 'unknown';

    const embed = new EmbedBuilder()
      .setTitle('Welcome to /ritual')
      .setColor(config.colors.darkRed || config.colors.red)
      .setDescription(
        [
          `${member}, welcome in.`,
          '',
          'Read the rules, grab your roles, and get comfortable.',
          'Chat, post, join calls, collect pfps and banners, level up, and don’t be weird.',
          '',
          '**Start here**',
          `• <#${config.channels.roles}> for roles`,
          `• <#${config.channels.general}> to talk`,
          `• <#${config.channels.pfps}> for pfps`,
          `• <#${config.channels.banners}> for banners`,
          '',
          `You are **Member #${memberNumber}**.`,
        ].join('\n')
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .setFooter({ text: '/ritual' })
      .setTimestamp();

    if (config.images?.welcome) {
      embed.setImage(config.images.welcome);
    }

    await welcomeChannel.send({
      content: `${member}`,
      embeds: [embed],
      allowedMentions: {
        users: [member.id],
      },
    }).catch(error => {
      console.log(`[WELCOME] Could not send welcome message: ${error.message}`);
    });

    await updateCounters(client).catch(() => {});
  },
};