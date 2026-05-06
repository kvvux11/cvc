const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('View important server roles.'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('CVC Roles')
      .setColor(config.colors.yellow)
      .setDescription('Here are some of the main roles in the server.')
      .addFields(
        { name: 'Car Provider', value: `<@&${config.roles.carProvider}>`, inline: true },
        { name: 'Verified Host', value: `<@&${config.roles.verifiedHost}>`, inline: true },
        { name: 'Garage Showcase', value: `<@&${config.roles.garageShowcase}>`, inline: true },
        { name: 'VIP', value: `<@&${config.roles.vip}>`, inline: true },
        { name: 'Priority Access', value: `<@&${config.roles.priorityAccess}>`, inline: true },
        { name: 'Staff', value: `<@&${config.roles.staff}>`, inline: true },
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};