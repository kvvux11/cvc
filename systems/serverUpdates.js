const { EmbedBuilder } = require('discord.js');
const { execSync } = require('node:child_process');
const config = require('../config');

let postedThisRun = false;

function getLatestCommitMessage() {
  try {
    const message = execSync('git log -1 --pretty=%B', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();

    return message || null;
  } catch {
    return null;
  }
}

async function postServerUpdate(client) {
  if (postedThisRun) return;
  postedThisRun = true;

  const channel = await client.channels
    .fetch(config.channels.serverUpdates)
    .catch(() => null);

  if (!channel) {
    console.log('[SERVER UPDATES] Channel not found.');
    return;
  }

  const commitMessage = getLatestCommitMessage();

  if (!commitMessage) {
    console.log('[SERVER UPDATES] No git commit message found.');
    return;
  }

  const cleanMessage = commitMessage
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle('/ritual update')
    .setColor(config.colors.darkRed || config.colors.red)
    .setDescription(cleanMessage)
    .setFooter({ text: 'skid system update' })
    .setTimestamp();

  await channel.send({
    embeds: [embed],
  }).catch(console.error);

  console.log('[SERVER UPDATES] Posted latest commit message.');
}

module.exports = {
  postServerUpdate,
};