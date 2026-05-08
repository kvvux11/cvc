const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { canUseOwner, deny, ownerCommandPermission } = require('../../systems/permissions');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roledebug')
    .setDescription('Shows configured /ritual role IDs and what they resolve to. Owner only.')
    .setDefaultMemberPermissions(ownerCommandPermission),

  async execute(interaction) {
    if (!canUseOwner(interaction.member)) {
      return interaction.reply(deny('Only the owner can use this command.'));
    }

    const entries = [
      ['member/initiate', config.roles.member],
      ['verified', config.roles.verified],
      ['trusted', config.roles.trusted],
      ['known', config.roles.known],
      ['proven', config.roles.proven],
      ['elite', config.roles.elite],
      ['ascendant', config.roles.ascendant],
      ['obsidian', config.roles.obsidian],
      ['giveawayPing', config.roles.giveawayPing],
      ['staff', config.roles.staff],
      ['ticketSupport', config.roles.ticketSupport],
      ['trialModerator', config.roles.trialModerator],
      ['moderator', config.roles.moderator],
      ['administrator', config.roles.administrator],
      ['owner', config.roles.owner],
    ];

    const lines = [];

    for (const [name, id] of entries) {
      const role = id ? await interaction.guild.roles.fetch(id).catch(() => null) : null;
      lines.push(`**${name}:** ${role ? `${role.name} (${id})` : `MISSING (${id || 'none'})`}`);
    }

    const embed = new EmbedBuilder()
      .setTitle('/ritual role debug')
      .setColor(config.colors.darkRed || config.colors.red)
      .setDescription(lines.join('\n').slice(0, 4096))
      .setFooter({ text: 'If a line resolves to the wrong role, fix that ID in config.js.' })
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
