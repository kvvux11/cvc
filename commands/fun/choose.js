const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Let the bot pick between options.')
    .addStringOption(option =>
      option.setName('options')
        .setDescription('Separate options with commas. Example: red, blue, black')
        .setRequired(true)
    ),

  async execute(interaction) {
    const raw = interaction.options.getString('options');
    const options = raw.split(',').map(x => x.trim()).filter(Boolean);

    if (options.length < 2) {
      return interaction.reply({
        content: 'Give me at least two options separated by commas.',
        ephemeral: true,
      });
    }

    const pick = options[Math.floor(Math.random() * options.length)];
    await interaction.reply(`I pick **${pick}**.`);
  },
};
