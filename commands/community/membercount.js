const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('View server member count.'),

  async execute(interaction) {
    await interaction.guild.members.fetch();

    const humans = interaction.guild.members.cache.filter(m => !m.user.bot).size;
    const bots = interaction.guild.members.cache.filter(m => m.user.bot).size;

    const embed = new EmbedBuilder()
      .setTitle('CVC Member Count')
      .setColor(config.colors.yellow)
      .addFields(
        { name: 'Members', value: `${humans}`, inline: true },
        { name: 'Bots', value: `${bots}`, inline: true },
        { name: 'Total', value: `${humans + bots}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};