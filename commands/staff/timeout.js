const { SlashCommandBuilder } = require('discord.js');
const ms = require('ms');
const { canUseMod, deny } = require('../../systems/permissions');
const { logModeration } = require('../../systems/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Example: 10m, 1h, 1d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!canUseMod(interaction.member)) return interaction.reply(deny());

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const duration = ms(interaction.options.getString('duration'));
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!duration || duration > ms('28d')) return interaction.reply({ content: 'Use a valid duration under 28 days.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: 'I cannot timeout that member.', ephemeral: true });

    await member.timeout(duration, reason);

    await logModeration(client, 'Member Timed Out', [
      { name: 'User', value: `${user.tag}`, inline: true },
      { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
      { name: 'Duration', value: interaction.options.getString('duration'), inline: true },
      { name: 'Reason', value: reason },
    ]);

    await interaction.reply(`Timed out **${user.tag}** for **${interaction.options.getString('duration')}**.`);
  },
};