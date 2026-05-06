const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View server info.'),

  async execute(interaction) {
    const guild = interaction.guild;
    await guild.members.fetch();

    const humans = guild.members.cache.filter(m => !m.user.bot).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setColor(config.colors.yellow)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Members', value: `${humans}`, inline: true },
        { name: 'Bots', value: `${bots}`, inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>` },
      );

    await interaction.reply({ embeds: [embed] });
  },
};