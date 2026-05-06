const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { sendLog } = require('../systems/logger');

module.exports = {
  name: Events.MessageUpdate,

  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setTitle('Message Edited')
      .setColor(config.colors.yellow)
      .addFields(
        { name: 'User', value: `${newMessage.author}`, inline: true },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Before', value: (oldMessage.content || 'Unknown').slice(0, 1000) },
        { name: 'After', value: (newMessage.content || 'Unknown').slice(0, 1000) }
      )
      .setTimestamp();

    await sendLog(client, embed);
  },
};