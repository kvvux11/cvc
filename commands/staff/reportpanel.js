const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { canUseOwner, deny, ownerCommandPermission } = require('../../systems/permissions');
const { reportPanelEmbed, reportButtons } = require('../../systems/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reportpanel')
    .setDescription('Post the report panel. Owner only.')
    .setDefaultMemberPermissions(ownerCommandPermission),

  async execute(interaction) {
    if (!canUseOwner(interaction.member)) {
      return interaction.reply(deny('Only the owner can use this command.'));
    }

    const channel = await interaction.guild.channels.fetch(config.channels.reportUser).catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: 'Report-a-user channel not found.',
        ephemeral: true,
      });
    }

    await channel.send({
      embeds: [reportPanelEmbed()],
      components: [reportButtons()],
    });

    await interaction.reply({
      content: 'Report panel posted.',
      ephemeral: true,
    });
  },
};