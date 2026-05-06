const { SlashCommandBuilder } = require('discord.js');

const questions = [
  'only drive F1 wheel cars forever or only drive Benny’s wheel cars forever?',
  'lose all your rare plates or lose all your modded paints?',
  'host free drops forever or never get another rare car?',
  'have one perfect garage or ten messy garages?',
  'drive clean builds only or wild modded builds only?',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wouldyourather')
    .setDescription('Get a GTA car would-you-rather question.'),

  async execute(interaction) {
    const question = questions[Math.floor(Math.random() * questions.length)];
    await interaction.reply(`Would you rather **${question}**`);
  },
};