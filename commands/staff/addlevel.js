const { SlashCommandBuilder } = require('discord.js');
const { canUseMod, deny, modCommandPermission } = require('../../systems/permissions');
const { getProfile, setXp, xpForLevel } = require('../../systems/levels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addlevel')
    .setDescription('Add levels to a member.')
    .setDefaultMemberPermissions(modCommandPermission)
    .addUserOption(o =>
      o.setName('user')
        .setDescription('Member')
        .setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('amount')
        .setDescription('How many levels to add')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    if (!canUseMod(interaction.member)) {
      return interaction.reply(deny('Only moderators or above can use this.'));
    }

    const user = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    const profile = getProfile(interaction.guild.id, user.id);
    const newLevel = profile.level + amount;
    const newXp = xpForLevel(newLevel);

    setXp(interaction.guild.id, user.id, newXp);

    await interaction.reply({
      content: `Added **${amount}** level(s) to ${user}. They are now **Level ${newLevel}**.`,
      ephemeral: true,
    });
  },
};