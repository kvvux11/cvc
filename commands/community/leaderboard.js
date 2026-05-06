const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../systems/levels');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server XP leaderboard.'),

  async execute(interaction) {
    const rows = getLeaderboard(interaction.guild.id, 10);

    const desc = rows.length
      ? rows.map((row, i) => `**${i + 1}.** <@${row.user_id}> — Level ${row.level} | ${row.xp} XP`).join('\n')
      : 'No leaderboard data yet.';

    const embed = new EmbedBuilder()
      .setTitle('CVC Leaderboard')
      .setColor(config.colors.yellow)
      .setDescription(desc)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};