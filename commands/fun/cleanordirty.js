const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cleanordirty')
    .setDescription('Decide if a build is clean or dirty.')
    .addStringOption(option =>
      option.setName('build')
        .setDescription('Build/car')
        .setRequired(true),
    ),

  async execute(interaction) {
    const build = interaction.options.getString('build');
    const results = [
      'clean as hell',
      'lowkey dirty',
      'belongs in the garage',
      'needs a rebuild',
      'certified CVC clean',
      'straight violation',
      'show car material',
    ];

    const result = results[Math.floor(Math.random() * results.length)];

    await interaction.reply(`🚗 **${build}** is **${result}**.`);
  },
};