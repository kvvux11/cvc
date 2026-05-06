const { Events, AuditLogEvent } = require('discord.js');
const { logAutoMod } = require('../systems/logger');

module.exports = {
  name: Events.GuildBanAdd,

  async execute(ban, client) {
    const logs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 1,
    }).catch(() => null);

    const entry = logs?.entries.first();
    const executor = entry?.executor;
    const reason = entry?.reason || ban.reason || 'No reason provided.';

    await logAutoMod(client, 'Member Banned', [
      { name: 'User', value: `${ban.user.tag}`, inline: true },
      { name: 'User ID', value: ban.user.id, inline: true },
      { name: 'Banned By', value: executor ? `${executor.tag}` : 'Unknown', inline: true },
      { name: 'Reason', value: reason },
    ]);
  },
};