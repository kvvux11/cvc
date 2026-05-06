const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('violaterate')
    .setDescription('See how much of a violation something is.')
    .addStringOption(option =>
      option.setName('thing')
        .setDescription('What are we rating?')
        .setRequired(true),
    ),

  async execute(interaction) {
    const thing = interaction.options.getString('thing');
    const rating = Math.floor(Math.random() * 101);

    await interaction.reply(`🚨 **${thing}** is a **${rating}% violation**.`);
  },
};