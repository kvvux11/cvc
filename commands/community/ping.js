const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot response time.'),

  async execute(interaction) {
    await interaction.reply(`Pong. Bot latency: **${interaction.client.ws.ping}ms**.`);
  },
};