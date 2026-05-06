const config = require('../config');

async function updateCounters(client) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return;

  await guild.members.fetch({ withPresences: true }).catch(() => {});

  const members = guild.members.cache;

  const realMembers = members.filter(member => !member.user.bot);
  const onlineMembers = realMembers.filter(member => {
    const status = member.presence?.status;
    return status === 'online' || status === 'idle' || status === 'dnd';
  });

  const staffMembers = realMembers.filter(member =>
    member.roles.cache.has(config.roles.staff)
  );

  const staffOnline = staffMembers.filter(member => {
    const status = member.presence?.status;
    return status === 'online' || status === 'idle' || status === 'dnd';
  });

  await renameVoiceChannel(client, config.channels.memberCount, `Members: ${realMembers.size}`);
  await renameVoiceChannel(client, config.channels.onlineMembers, `Online: ${onlineMembers.size}`);
  await renameVoiceChannel(client, config.channels.staffCount, `Staff: ${staffMembers.size}`);
  await renameVoiceChannel(client, config.channels.staffOnline, `Staff Online: ${staffOnline.size}`);
}

async function renameVoiceChannel(client, channelId, name) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  if (channel.name === name) return;

  await channel.setName(name).catch(error => {
    console.log(`Could not rename ${channelId}:`, error.message);
  });
}

module.exports = {
  updateCounters,
};