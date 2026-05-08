const config = require('../config');

async function enforceRitualChannelPermissions(client) {
  if (!config.channels.ritual) return;

  const channel = await client.channels.fetch(config.channels.ritual).catch(() => null);

  if (!channel || !channel.guild || !channel.permissionOverwrites) {
    console.log('[RITUAL CHANNEL] Channel not found or not editable.');
    return;
  }

  const allowedRoles = [
    ['trusted', config.roles.trusted],
    ['known', config.roles.known],
    ['proven', config.roles.proven],
    ['elite', config.roles.elite],
    ['ascendant', config.roles.ascendant],
    ['obsidian', config.roles.obsidian],
    ['ticketSupport', config.roles.ticketSupport],
    ['staff', config.roles.staff],
    ['trialModerator', config.roles.trialModerator],
    ['moderator', config.roles.moderator],
    ['administrator', config.roles.administrator],
    ['owner', config.roles.owner],
  ];

  await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
  }).catch(error => {
    console.log(`[RITUAL CHANNEL] Could not lock @everyone: ${error.message}`);
  });

  for (const [name, id] of allowedRoles) {
    if (!id) continue;

    const role = await channel.guild.roles.fetch(id).catch(() => null);

    if (!role) {
      console.log(`[RITUAL CHANNEL] Skipped missing role "${name}" (${id})`);
      continue;
    }

    console.log(`[RITUAL CHANNEL] Allowing ${name} -> ${role.name}`);

    await channel.permissionOverwrites.edit(role.id, {
      ViewChannel: true,
      SendMessages: true,
      SendMessagesInThreads: true,
      CreatePublicThreads: true,
      ReadMessageHistory: true,
    }).catch(error => {
      console.log(`[RITUAL CHANNEL] Could not allow role "${name}" (${id}): ${error.message}`);
    });
  }

  console.log('[RITUAL CHANNEL] Trusted+ chat permissions enforced.');
}

module.exports = { enforceRitualChannelPermissions };
