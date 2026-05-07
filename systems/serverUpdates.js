const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function postServerUpdate(client, updates = []) {
  const channel = await client.channels.fetch(config.channels.serverUpdates).catch(() => null);
  if (!channel) return;

  const today = new Date().toISOString().slice(0, 10);
  const key = `ritual-update-${today}`;

  // simple in-memory guard per restart; keeps it from spamming when ready runs once.
  if (client.__lastServerUpdateKey === key) return;
  client.__lastServerUpdateKey = key;

  const embed = new EmbedBuilder()
    .setTitle('Server Update')
    .setColor(config.colors.darkRed || config.colors.red)
    .setDescription('small cleanup pushed live.')
    .addFields({
      name: 'Changed',
      value: updates.map(x => `• ${x}`).join('\n').slice(0, 1024) || '• general fixes',
    })
    .setFooter({ text: 'skid • /ritual' })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

module.exports = { postServerUpdate };
