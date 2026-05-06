const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getProfile, xpForLevel } = require('../../systems/levels');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Check your level or someone else’s level.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const profile = getProfile(interaction.guild.id, user.id);
    const nextXp = xpForLevel(profile.level + 1);

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s Level`)
      .setColor(config.colors.yellow)
      .addFields(
        { name: 'Level', value: `${profile.level}`, inline: true },
        { name: 'XP', value: `${profile.xp}/${nextXp}`, inline: true },
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};