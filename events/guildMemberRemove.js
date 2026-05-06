const { Events, AuditLogEvent } = require('discord.js');
const { updateCounters } = require('../systems/counters');
const { logInfo, logAutoMod } = require('../systems/logger');

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member, client) {
    const logs = await member.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberKick,
      limit: 1,
    }).catch(() => null);

    const entry = logs?.entries.first();

    const wasKick =
      entry &&
      entry.target?.id === member.id &&
      Date.now() - entry.createdTimestamp < 5000;

    if (wasKick) {
      await logAutoMod(client, 'Member Kicked', [
        { name: 'User', value: `${member.user.tag}`, inline: true },
        { name: 'User ID', value: member.id, inline: true },
        { name: 'Kicked By', value: entry.executor ? `${entry.executor.tag}` : 'Unknown', inline: true },
        { name: 'Reason', value: entry.reason || 'No reason provided.' },
      ]);
    } else {
      await logInfo(client, 'Member Left', `${member.user.tag} left the server.`, [
        { name: 'User ID', value: member.id, inline: true },
      ]);
    }

    await updateCounters(client);
  },
};