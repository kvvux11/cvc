const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getProfile, xpForLevel } = require('../../systems/levels');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your CVC profile.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false),
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const profile = getProfile(interaction.guild.id, user.id);
    const nextXp = xpForLevel(profile.level + 1);

    const badges = [];

    if (member?.roles.cache.has(config.roles.vip)) badges.push('VIP');
    if (member?.roles.cache.has(config.roles.verifiedHost)) badges.push('Verified Host');
    if (member?.roles.cache.has(config.roles.carProvider)) badges.push('Car Provider');
    if (member?.roles.cache.has(config.roles.garageShowcase)) badges.push('Garage Showcase');
    if (member?.roles.cache.has(config.roles.staff)) badges.push('Staff');

    const embed = new EmbedBuilder()
      .setTitle(`${user.username}'s CVC Profile`)
      .setColor(config.colors.yellow)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Level', value: `${profile.level}`, inline: true },
        { name: 'XP', value: `${profile.xp}/${nextXp}`, inline: true },
        { name: 'Badges', value: badges.length ? badges.join(', ') : 'None yet.' },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};