const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View a user avatar.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Avatar`)
      .setColor(config.colors.yellow)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }));

    await interaction.reply({ embeds: [embed] });
  },
};