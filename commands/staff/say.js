const { SlashCommandBuilder } = require('discord.js');
const { canUseOwner, deny, ownerCommandPermission } = require('../../systems/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something. Owner only.')
    .setDefaultMemberPermissions(ownerCommandPermission)
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Message')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!canUseOwner(interaction.member)) {
      return interaction.reply(deny('Only the owner can use this command.'));
    }

    await interaction.channel.send(interaction.options.getString('message'));

    await interaction.reply({
      content: 'Sent.',
      ephemeral: true,
    });
  },
};