const { SlashCommandBuilder } = require('discord.js');
const { canUseTrialMod, deny, manageMessagesPermission } = require('../../systems/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages.')
    .setDefaultMemberPermissions(manageMessagesPermission)
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('Amount 1-100')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!canUseTrialMod(interaction.member)) {
      return interaction.reply(deny('Only trial moderators or above can clear messages.'));
    }

    const amount = interaction.options.getInteger('amount');

    if (amount < 1 || amount > 100) {
      return interaction.reply({
        content: 'Use a number from 1 to 100.',
        ephemeral: true,
      });
    }

    await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
      content: `Deleted ${amount} messages.`,
      ephemeral: true,
    });
  },
};