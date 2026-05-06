const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { updateCounters } = require('../systems/counters');
const { logInfo } = require('../systems/logger');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member, client) {
    await member.roles.add(config.roles.member).catch(console.error);

    const welcomeChannel = await member.guild.channels
      .fetch(config.channels.welcome)
      .catch(() => null);

    if (welcomeChannel) {
      const embed = new EmbedBuilder()
        .setTitle('Welcome to Cruel Violations Customs')
        .setColor(config.colors.yellow)
        .setDescription(`${member}, welcome to **CVC**. Check the rules, grab your roles, and enjoy the server.`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(config.gifs.welcome)
        .setFooter({ text: `Member #${member.guild.memberCount}` })
        .setTimestamp();

      await welcomeChannel.send({
        content: `${member}`,
        embeds: [embed],
        allowedMentions: {
          users: [member.id],
        },
      }).catch(console.error);
    }

    await logInfo(client, 'Member Joined', `${member.user.tag} joined the server.`, [
      { name: 'User', value: `${member}`, inline: true },
      { name: 'User ID', value: member.id, inline: true },
    ]);

    await updateCounters(client);
  },
};