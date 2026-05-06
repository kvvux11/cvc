const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('garagevalue')
    .setDescription('Get a fake value for your garage.'),

  async execute(interaction) {
    const value = Math.floor(Math.random() * 950_000_000) + 50_000_000;

    await interaction.reply(`🏁 ${interaction.user}'s garage is worth **$${value.toLocaleString()}** in pure CVC tax.`);
  },
};