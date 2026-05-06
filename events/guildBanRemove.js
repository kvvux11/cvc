const { Events, AuditLogEvent } = require('discord.js');
const { logAutoMod } = require('../systems/logger');

module.exports = {
  name: Events.GuildBanRemove,

  async execute(ban, client) {
    const logs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanRemove,
      limit: 1,
    }).catch(() => null);

    const entry = logs?.entries.first();
    const executor = entry?.executor;
    const reason = entry?.reason || 'No reason provided.';

    await logAutoMod(client, 'Member Unbanned', [
      { name: 'User', value: `${ban.user.tag}`, inline: true },
      { name: 'User ID', value: ban.user.id, inline: true },
      { name: 'Unbanned By', value: executor ? `${executor.tag}` : 'Unknown', inline: true },
      { name: 'Reason', value: reason },
    ]);
  },
};