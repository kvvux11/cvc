const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate')
    .setDescription('Rate anything out of 10.')
    .addStringOption(option =>
      option.setName('thing')
        .setDescription('What should I rate?')
        .setRequired(true)
        .setMaxLength(100)
    ),

  async execute(interaction) {
    const thing = interaction.options.getString('thing');
    const rating = Math.floor(Math.random() * 11);
    const extra = rating >= 9 ? 'clean.' : rating >= 6 ? 'decent.' : rating >= 3 ? 'rough.' : 'tragic.';

    await interaction.reply(`**${thing}** gets a **${rating}/10** — ${extra}`);
  },
};
