const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('View info about a user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User')
        .setRequired(false),
    ),

  async execute(interaction) {
    const member = interaction.options.getMember('user') || interaction.member;

    const embed = new EmbedBuilder()
      .setTitle(`${member.user.username}`)
      .setColor(config.colors.yellow)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User ID', value: member.id },
        { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};