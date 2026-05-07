const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const config = require('../config');

let started = false;
let index = 0;

const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

function getLocalFiles(folderPath) {
  ensureFolder(folderPath);

  return fs
    .readdirSync(folderPath)
    .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => path.join(folderPath, file));
}

function getMediaTypes() {
  return [
    {
      name: 'pfps',
      label: 'pfp',
      channelId: config.channels.pfps,
      folder: config.mediaPoster.folders.pfps,
      remote: config.mediaPoster.remote.pfps,
    },
    {
      name: 'banners',
      label: 'banner',
      channelId: config.channels.banners,
      folder: config.mediaPoster.folders.banners,
      remote: config.mediaPoster.remote.banners,
    },
    {
      name: 'animals',
      label: 'animal',
      channelId: config.channels.animals,
      folder: config.mediaPoster.folders.animals,
      remote: config.mediaPoster.remote.animals,
    },
    {
      name: 'cars',
      label: 'car',
      channelId: config.channels.cars,
      folder: config.mediaPoster.folders.cars,
      remote: config.mediaPoster.remote.cars,
    },
  ];
}

async function sendLocalMedia(channel, type) {
  const files = getLocalFiles(type.folder);

  if (!files.length) return false;

  const selected = files[Math.floor(Math.random() * files.length)];
  const attachment = new AttachmentBuilder(selected);

  await channel.send({
    content: `⌁ ${type.label}`,
    files: [attachment],
  });

  return true;
}

async function sendRemoteMedia(channel, type) {
  const urls = type.remote || [];
  if (!urls.length) return false;

  const selected = urls[Math.floor(Math.random() * urls.length)];

  await channel.send({
    content: `⌁ ${type.label}\n${selected}`,
  });

  return true;
}

async function postOne(client) {
  const types = getMediaTypes().filter(type => type.channelId);

  if (!types.length) {
    console.log('[AUTO MEDIA] No media channel IDs found.');
    return;
  }

  const type = types[index % types.length];
  index++;

  const channel = await client.channels.fetch(type.channelId).catch(() => null);

  if (!channel) {
    console.log(`[AUTO MEDIA] Channel not found for ${type.name}: ${type.channelId}`);
    return;
  }

  if (!channel.send) {
    console.log(`[AUTO MEDIA] Channel is not sendable for ${type.name}`);
    return;
  }

  try {
    const sentLocal = await sendLocalMedia(channel, type);

    if (!sentLocal) {
      await sendRemoteMedia(channel, type);
    }

    console.log(`[AUTO MEDIA] Posted ${type.name}`);
  } catch (error) {
    console.error(`[AUTO MEDIA] Failed posting ${type.name}:`, error.message);
  }
}

function startMediaPoster(client) {
  if (started) return;

  if (!config.mediaPoster?.enabled) {
    console.log('[AUTO MEDIA] Disabled in config.');
    return;
  }

  started = true;

  console.log(`[AUTO MEDIA] Started. Posting every ${config.mediaPoster.intervalMs}ms.`);

  setTimeout(() => {
    postOne(client).catch(console.error);
  }, 5000);

  setInterval(() => {
    postOne(client).catch(console.error);
  }, config.mediaPoster.intervalMs);
}

module.exports = {
  startMediaPoster,
};