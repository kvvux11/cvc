const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { canUseAdmin, deny } = require('../../systems/permissions');
const { ticketPanelEmbed, ticketButtons } = require('../../systems/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post the ticket panel.'),

  async execute(interaction) {
    if (!canUseAdmin(interaction.member)) {
      return interaction.reply(deny('Only admins can use this command.'));
    }

    const channel = await interaction.guild.channels.fetch(config.channels.openTicket);

    await channel.send({
      embeds: [ticketPanelEmbed()],
      components: [ticketButtons()],
    });

    await interaction.reply({
      content: 'Ticket panel posted.',
      ephemeral: true,
    });
  },
};