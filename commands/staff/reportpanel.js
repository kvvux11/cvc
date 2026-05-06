const { SlashCommandBuilder } = require('discord.js');
const config = require('../../config');
const { canUseAdmin, deny } = require('../../systems/permissions');
const { reportPanelEmbed, reportButtons } = require('../../systems/tickets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reportpanel')
    .setDescription('Post the report panel.'),

  async execute(interaction) {
    if (!canUseAdmin(interaction.member)) {
      return interaction.reply(deny('Only admins can use this command.'));
    }

    const channel = await interaction.guild.channels.fetch(config.channels.reportUser);

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