const { SlashCommandBuilder } = require('discord.js');
const { canUseAdmin, deny } = require('../../systems/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something. Admin only.')
    .addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),

  async execute(interaction) {
    if (!canUseAdmin(interaction.member)) return interaction.reply(deny('Only admins can use this.'));

    await interaction.channel.send(interaction.options.getString('message'));
    await interaction.reply({ content: 'Sent.', ephemeral: true });
  },
};