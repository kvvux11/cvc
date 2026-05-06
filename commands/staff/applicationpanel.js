const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { canUseOwner, deny, ownerCommandPermission } = require('../../systems/permissions');
const { applicationPanelEmbed, applicationButtons } = require('../../systems/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('applicationpanel')
    .setDescription('Post the staff application panel. Owner only.')
    .setDefaultMemberPermissions(ownerCommandPermission),

  async execute(interaction) {
    if (!canUseOwner(interaction.member)) {
      return interaction.reply(deny('Only the owner can use this command.'));
    }

    const channel = await interaction.guild.channels.fetch(config.channels.staffApplications).catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: 'Staff applications channel not found.',
        ephemeral: true,
      });
    }

    await channel.send({
      embeds: [applicationPanelEmbed()],
      components: [applicationButtons()],
    });

    await interaction.reply({
      content: 'Staff application panel posted.',
      ephemeral: true,
    });
  },
};