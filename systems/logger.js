const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function sendLog(client, embed) {
  const channel = await client.channels.fetch(config.channels.modLogs).catch(() => null);
  if (!channel) return;

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function logInfo(client, title, description, fields = []) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(config.colors.yellow)
    .setDescription(description || null)
    .addFields(fields)
    .setTimestamp();

  await sendLog(client, embed);
}

async function logModeration(client, title, fields = []) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(config.colors.red)
    .addFields(fields)
    .setTimestamp();

  await sendLog(client, embed);
}

async function logAutoMod(client, title, fields = []) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(config.colors.red)
    .addFields(fields)
    .setFooter({ text: 'CVC Audit Log' })
    .setTimestamp();

  await sendLog(client, embed);
}

module.exports = {
  sendLog,
  logInfo,
  logModeration,
  logAutoMod,
};