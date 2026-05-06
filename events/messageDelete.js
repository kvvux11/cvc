const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { sendLog } = require('../systems/logger');

module.exports = {
  name: Events.MessageDelete,

  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    const content = message.content || 'No text content.';

    const embed = new EmbedBuilder()
      .setTitle('Message Deleted')
      .setColor(config.colors.red)
      .addFields(
        { name: 'User', value: `${message.author}`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Content', value: content.slice(0, 1000) }
      )
      .setTimestamp();

    await sendLog(client, embed);
  },
};