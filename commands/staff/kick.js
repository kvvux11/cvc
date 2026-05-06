const { SlashCommandBuilder } = require('discord.js');
const { canUseMod, deny } = require('../../systems/permissions');
const { logModeration } = require('../../systems/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member.')
    .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    if (!canUseMod(interaction.member)) return interaction.reply(deny());

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    if (!member) return interaction.reply({ content: 'Member not found.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: 'I cannot kick that member.', ephemeral: true });

    await member.kick(reason);

    await logModeration(client, 'Member Kicked', [
      { name: 'User', value: `${user.tag}`, inline: true },
      { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
      { name: 'Reason', value: reason },
    ]);

    await interaction.reply(`Kicked **${user.tag}**.`);
  },
};