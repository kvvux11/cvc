const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View bot help.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('CVC Bot Help')
      .setColor(config.colors.yellow)
      .setDescription('Useful commands for Cruel Violations Customs.')
      .addFields(
        {
          name: 'Community',
          value: '`/help` `/level` `/leaderboard` `/profile` `/serverinfo` `/userinfo` `/avatar` `/membercount` `/roles`',
        },
        {
          name: 'Fun',
          value: '`/coinflip` `/8ball` `/ratecar` `/garagevalue` `/violaterate` `/cleanordirty` `/wouldyourather`',
        },
        {
          name: 'Info',
          value: 'Need help? Ask staff or open a ticket. Don’t ping the owner directly.',
        },
      )
      .setFooter({ text: 'Cruel Violations Customs' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};