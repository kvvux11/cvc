const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { sendLog, logAutoMod } = require('../systems/logger');
const { updateCounters } = require('../systems/counters');

module.exports = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember, newMember, client) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const added = newRoles.filter(role => !oldRoles.has(role.id));
    const removed = oldRoles.filter(role => !newRoles.has(role.id));

    if (added.size > 0 || removed.size > 0) {
      const embed = new EmbedBuilder()
        .setTitle('Member Roles Updated')
        .setColor(config.colors.white)
        .addFields(
          { name: 'User', value: `${newMember}`, inline: true },
          { name: 'User ID', value: newMember.id, inline: true },
          { name: 'Added', value: added.map(r => r.name).join(', ') || 'None' },
          { name: 'Removed', value: removed.map(r => r.name).join(', ') || 'None' },
        )
        .setTimestamp();

      await sendLog(client, embed);
    }

    const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
    const newTimeout = newMember.communicationDisabledUntilTimestamp;

    if (!oldTimeout && newTimeout) {
      await logAutoMod(client, 'Member Timed Out', [
        { name: 'User', value: `${newMember.user.tag}`, inline: true },
        { name: 'User ID', value: newMember.id, inline: true },
        { name: 'Until', value: `<t:${Math.floor(newTimeout / 1000)}:F>` },
      ]);
    }

    if (oldTimeout && !newTimeout) {
      await logAutoMod(client, 'Member Timeout Removed', [
        { name: 'User', value: `${newMember.user.tag}`, inline: true },
        { name: 'User ID', value: newMember.id, inline: true },
      ]);
    }

    if (oldTimeout && newTimeout && oldTimeout !== newTimeout) {
      await logAutoMod(client, 'Member Timeout Updated', [
        { name: 'User', value: `${newMember.user.tag}`, inline: true },
        { name: 'User ID', value: newMember.id, inline: true },
        { name: 'New Until', value: `<t:${Math.floor(newTimeout / 1000)}:F>` },
      ]);
    }

    await updateCounters(client);
  },
};