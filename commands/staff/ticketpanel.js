const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { canUseOwner, deny, ownerCommandPermission } = require('../../systems/permissions');
const { ticketPanelEmbed, ticketButtons } = require('../../systems/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketpanel')
    .setDescription('Post the ticket panel. Owner only.')
    .setDefaultMemberPermissions(ownerCommandPermission),

  async execute(interaction) {
    if (!canUseOwner(interaction.member)) {
      return interaction.reply(deny('Only the owner can use this command.'));
    }

    const channel = await interaction.guild.channels
      .fetch(config.channels.openTicket)
      .catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: 'Ticket channel not found. Check config.channels.openTicket.',
        ephemeral: true,
      });
    }

    await channel.send({
      embeds: [ticketPanelEmbed()],
      components: ticketButtons(),
    });

    await interaction.reply({
      content: 'Ticket panel posted.',
      ephemeral: true,
    });
  },
};