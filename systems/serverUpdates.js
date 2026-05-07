const { EmbedBuilder } = require('discord.js');
const config = require('../config');

let postedThisRun = false;

async function postServerUpdate(client, updates = []) {
  if (postedThisRun) return;
  postedThisRun = true;

  const channel = await client.channels
    .fetch(config.channels.serverUpdates)
    .catch(() => null);

  if (!channel) {
    console.log('[SERVER UPDATES] Channel not found.');
    return;
  }

  const updateList = Array.isArray(updates)
    ? updates
    : [String(updates)];

  const description = updateList
    .filter(Boolean)
    .map(update => `• ${update}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('/ritual update')
    .setColor(config.colors.darkRed || config.colors.red)
    .setDescription(description || 'skid has been updated.')
    .setFooter({ text: 'skid system update' })
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  }).catch(console.error);

  console.log('[SERVER UPDATES] Posted update message.');
}

module.exports = {
  postServerUpdate,
};