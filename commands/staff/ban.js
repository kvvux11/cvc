const { SlashCommandBuilder } = require('discord.js');
const { canUseAdmin, deny, adminCommandPermission } = require('../../systems/permissions');
const { logModeration } = require('../../systems/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member. Admin only.')
    .setDefaultMemberPermissions(adminCommandPermission)
    .addUserOption(o =>
      o.setName('user')
        .setDescription('User')
        .setRequired(true)
    )
    .addStringOption(o =>
      o.setName('reason')
        .setDescription('Reason')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    if (!canUseAdmin(interaction.member)) {
      return interaction.reply(deny('Only administrators can ban.'));
    }

    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    if (!member) {
      return interaction.reply({
        content: 'Member not found.',
        ephemeral: true,
      });
    }

    if (!member.bannable) {
      return interaction.reply({
        content: 'I cannot ban that member.',
        ephemeral: true,
      });
    }

    await member.send(`You were banned from **${interaction.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
    await member.ban({ reason });

    await logModeration(client, 'Member Banned', [
      { name: 'User', value: `${user.tag}`, inline: true },
      { name: 'Admin', value: `${interaction.user.tag}`, inline: true },
      { name: 'Reason', value: reason },
    ]);

    await interaction.reply({
      content: `Banned **${user.tag}**.`,
      ephemeral: true,
    });
  },
};