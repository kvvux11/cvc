const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const config = require('../config');

let started = false;
let typeIndex = 0;
const recentlyPosted = new Map();

const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

function ensureTextFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
}

function getLocalFiles(folderPath) {
  ensureFolder(folderPath);

  return fs
    .readdirSync(folderPath)
    .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => path.join(folderPath, file));
}

function getCuratedUrls(filePath) {
  ensureTextFile(filePath);

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => /^https?:\/\//i.test(line));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomNotRecent(typeName, arr) {
  if (!arr.length) return null;

  const last = recentlyPosted.get(typeName);

  if (arr.length === 1) {
    recentlyPosted.set(typeName, arr[0]);
    return arr[0];
  }

  let chosen = pickRandom(arr);
  let tries = 0;

  while (chosen === last && tries < 10) {
    chosen = pickRandom(arr);
    tries++;
  }

  recentlyPosted.set(typeName, chosen);
  return chosen;
}

async function fetchPexelsImage(query) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const page = Math.floor(Math.random() * 20) + 1;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=30&page=${page}`;

  const res = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const data = await res.json().catch(() => null);
  if (!data?.photos?.length) return null;

  const photo = pickRandom(data.photos);
  return photo?.src?.large2x || photo?.src?.large || photo?.src?.original || null;
}

async function fetchPfpsGgImages() {
  const sources = [
    'https://pfps.gg',
    'https://pfps.gg/pfps',
    'https://pfps.gg/anime',
    'https://pfps.gg/aesthetic',
    'https://pfps.gg/dark',
  ];

  const urls = [];

  for (const source of sources) {
    const res = await fetch(source, {
      headers: {
        'User-Agent': 'Mozilla/5.0 skid-discord-bot',
      },
    }).catch(() => null);

    if (!res || !res.ok) continue;

    const html = await res.text().catch(() => '');
    if (!html) continue;

    const matches = html.match(/https?:\/\/[^"' <>()]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^"' <>()]*)?/gi) || [];

    for (const match of matches) {
      const clean = match.replace(/&amp;/g, '&');

      if (
        clean.includes('pfps.gg') ||
        clean.includes('cdn') ||
        clean.includes('media')
      ) {
        urls.push(clean);
      }
    }
  }

  return [...new Set(urls)].slice(0, 100);
}

async function sendAsUploadFromUrl(channel, typeName, label, imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 skid-discord-bot',
    },
  }).catch(() => null);

  if (!response || !response.ok) return false;

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.startsWith('image/')) {
    return false;
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // avoid accidentally uploading huge files
  if (buffer.length > 8 * 1024 * 1024) {
    return false;
  }

  let ext = '.jpg';
  if (contentType.includes('png')) ext = '.png';
  if (contentType.includes('gif')) ext = '.gif';
  if (contentType.includes('webp')) ext = '.webp';

  const attachment = new AttachmentBuilder(buffer, {
    name: `${typeName}-${Date.now()}${ext}`,
  });

  await channel.send({
    content: `⌁ ${label}`,
    files: [attachment],
  });

  return true;
}

async function sendLocalMedia(channel, type) {
  const files = getLocalFiles(type.folder);
  if (!files.length) return false;

  const selected = pickRandomNotRecent(type.name, files);
  if (!selected) return false;

  const attachment = new AttachmentBuilder(selected);

  await channel.send({
    content: `⌁ ${type.label}`,
    files: [attachment],
  });

  return true;
}

async function sendCuratedMedia(channel, type) {
  if (!type.urlsFile) return false;

  const urls = getCuratedUrls(type.urlsFile);
  if (!urls.length) return false;

  const selected = pickRandomNotRecent(type.name, urls);
  if (!selected) return false;

  return sendAsUploadFromUrl(channel, type.name, type.label, selected);
}

async function sendPfpsGgMedia(channel, type) {
  if (type.name !== 'pfps') return false;

  const urls = await fetchPfpsGgImages().catch(() => []);
  if (!urls.length) return false;

  const shuffled = urls.sort(() => Math.random() - 0.5);

  for (const url of shuffled.slice(0, 15)) {
    const selected = pickRandomNotRecent(type.name, [url]);
    if (!selected) continue;

    const ok = await sendAsUploadFromUrl(channel, type.name, type.label, selected).catch(() => false);
    if (ok) return true;
  }

  return false;
}

async function sendPexelsMedia(channel, type) {
  if (!type.queries?.length) return false;
  if (!process.env.PEXELS_API_KEY) return false;

  const shuffledQueries = [...type.queries].sort(() => Math.random() - 0.5);

  for (const query of shuffledQueries) {
    const imageUrl = await fetchPexelsImage(query);
    if (!imageUrl) continue;

    const last = recentlyPosted.get(type.name);
    if (last === imageUrl) continue;

    recentlyPosted.set(type.name, imageUrl);

    const ok = await sendAsUploadFromUrl(channel, type.name, type.label, imageUrl).catch(() => false);
    if (ok) return true;
  }

  return false;
}

function getMediaTypes() {
  return [
    {
      name: 'pfps',
      label: 'pfp',
      channelId: config.channels.pfps,
      folder: './assets/pfps',
      urlsFile: './sources/pfps.txt',
      queries: [],
    },
    {
      name: 'banners',
      label: 'banner',
      channelId: config.channels.banners,
      folder: './assets/banners',
      urlsFile: './sources/banners.txt',
      queries: [],
    },
    {
      name: 'animals',
      label: 'animal',
      channelId: config.channels.animals,
      folder: './assets/animals',
      urlsFile: './sources/animals.txt',
      queries: [
        'black cat portrait',
        'wolf dark portrait',
        'tiger face portrait',
        'crow dark aesthetic',
        'black panther portrait',
        'snake black aesthetic',
        'fox portrait',
      ],
    },
    {
      name: 'cars',
      label: 'car',
      channelId: config.channels.cars,
      folder: './assets/cars',
      urlsFile: './sources/cars.txt',
      queries: [
        'jdm night car',
        'dark sports car',
        'bmw night street',
        'nissan skyline night',
        'stance car moody',
        'drift car night',
        'black car cinematic',
      ],
    },
  ];
}

async function postOne(client) {
  const types = getMediaTypes().filter(type => type.channelId);

  if (!types.length) {
    console.log('[AUTO MEDIA] No media channel IDs found.');
    return;
  }

  const type = types[typeIndex % types.length];
  typeIndex++;

  const channel = await client.channels.fetch(type.channelId).catch(() => null);

  if (!channel) {
    console.log(`[AUTO MEDIA] Channel not found for ${type.name}: ${type.channelId}`);
    return;
  }

  try {
    let posted = false;

    posted = await sendLocalMedia(channel, type);
    if (!posted) posted = await sendCuratedMedia(channel, type);
    if (!posted) posted = await sendPfpsGgMedia(channel, type);
    if (!posted) posted = await sendPexelsMedia(channel, type);

    if (!posted) {
      console.log(`[AUTO MEDIA] Nothing available for ${type.name}. Add local files, curated URLs, or PEXELS_API_KEY.`);
      return;
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
