const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ratecar')
    .setDescription('Rate a car/build.')
    .addStringOption(option =>
      option.setName('car')
        .setDescription('Car/build name')
        .setRequired(true),
    ),

  async execute(interaction) {
    const car = interaction.options.getString('car');
    const rating = Math.floor(Math.random() * 11);

    await interaction.reply(`🚗 **${car}** gets a **${rating}/10** from CVC.`);
  },
};