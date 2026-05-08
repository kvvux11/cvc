const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');

async function enforceRitualChannelPermissions(client) {
  if (!config.channels.ritual) return;

  const channel = await client.channels.fetch(config.channels.ritual).catch(() => null);

  if (!channel || !channel.guild || !channel.permissionOverwrites) {
    console.log('[RITUAL CHANNEL] Channel not found or not editable.');
    return;
  }

  const allowedRoles = [
    config.roles.trusted,
    config.roles.known,
    config.roles.proven,
    config.roles.elite,
    config.roles.ascendant,
    config.roles.obsidian,
    config.roles.booster,
    config.roles.ticketSupport,
    config.roles.staff,
    config.roles.trialModerator,
    config.roles.moderator,
    config.roles.administrator,
    config.roles.owner,
  ].filter(Boolean);

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
  }).catch(error => {
    console.log(`[RITUAL CHANNEL] Could not lock @everyone: ${error.message}`);
  });

  for (const roleId of allowedRoles) {
    await channel.permissionOverwrites.edit(roleId, {
      ViewChannel: true,
      SendMessages: true,
      SendMessagesInThreads: true,
      CreatePublicThreads: true,
      ReadMessageHistory: true,
    }).catch(error => {
      console.log(`[RITUAL CHANNEL] Could not allow role ${roleId}: ${error.message}`);
    });
  }

  console.log('[RITUAL CHANNEL] Trusted+ chat permissions enforced.');
}

module.exports = { enforceRitualChannelPermissions };
