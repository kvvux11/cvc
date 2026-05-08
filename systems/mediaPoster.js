const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const config = require('../config');

let started = false;
let typeIndex = 0;

const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const historyPath = './sources/media-history.json';

const pools = {
  pfps: [],
  banners: [],
};

const lastPosted = {
  pfps: null,
  banners: null,
};

function getIntervalMs() {
  // 5 seconds is spammy and makes repeats way more obvious.
  return config.mediaPoster?.intervalMs || 60000;
}

function ensureFolder(folderPath) {
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}

function ensureTextFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '', 'utf8');
}

function ensureHistoryFile() {
  ensureFolder('./sources');
  if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, '{}', 'utf8');
}

function readHistory() {
  ensureHistoryFile();

  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeHistory(data) {
  ensureHistoryFile();
  fs.writeFileSync(historyPath, JSON.stringify(data, null, 2), 'utf8');
}

function getUsed(typeName) {
  const history = readHistory();
  return Array.isArray(history[typeName]) ? history[typeName] : [];
}

function hasBeenUsed(typeName, value) {
  return getUsed(typeName).includes(value);
}

function markUsed(typeName, value) {
  const history = readHistory();
  if (!Array.isArray(history[typeName])) history[typeName] = [];

  history[typeName].push(value);
  history[typeName] = [...new Set(history[typeName])].slice(-500);

  writeHistory(history);
}

function resetUsedForType(typeName) {
  const history = readHistory();
  history[typeName] = [];
  writeHistory(history);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function isImageUrl(url) {
  return /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(String(url || ''));
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

function imageLooksBad(url) {
  const lower = String(url || '').toLowerCase();

  return (
    lower.includes('logo') ||
    lower.includes('favicon') ||
    lower.includes('apple-touch') ||
    lower.includes('emoji.gg') ||
    lower.includes('stickers.gg') ||
    lower.includes('soundboards.gg') ||
    lower.includes('themes.gg') ||
    lower.includes('disforge') ||
    lower.includes('placeholder') ||
    lower.includes('font') ||
    lower.includes('avatar-maker') ||
    lower.includes('banner-maker')
  );
}

async function fetchDiscordChannelImages(client, type) {
  const channel = await client.channels.fetch(type.channelId).catch(() => null);
  if (!channel?.messages?.fetch) return [];

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return [];

  const urls = new Set();

  for (const message of messages.values()) {
    // do not reuse media skid already posted itself
    if (message.author?.id === client.user.id) continue;

    for (const attachment of message.attachments.values()) {
      if (attachment?.contentType?.startsWith('image/') || isImageUrl(attachment.url)) {
        if (!imageLooksBad(attachment.url)) urls.add(attachment.url);
      }
    }

    for (const embed of message.embeds || []) {
      if (embed.image?.url && isImageUrl(embed.image.url) && !imageLooksBad(embed.image.url)) {
        urls.add(embed.image.url);
      }

      if (embed.thumbnail?.url && isImageUrl(embed.thumbnail.url) && !imageLooksBad(embed.thumbnail.url)) {
        urls.add(embed.thumbnail.url);
      }
    }
  }

  return [...urls];
}

async function buildPool(client, type) {
  const localFiles = getLocalFiles(type.folder).map(file => ({
    kind: 'local',
    value: file,
  }));

  const sourceUrls = getCuratedUrls(type.urlsFile)
    .filter(url => !imageLooksBad(url))
    .map(url => ({
      kind: 'url',
      value: url,
    }));

  const channelHistoryUrls = await fetchDiscordChannelImages(client, type).catch(() => []);
  const channelHistory = channelHistoryUrls.map(url => ({
    kind: 'url',
    value: url,
  }));

  const seen = new Set();
  const combined = [...localFiles, ...sourceUrls, ...channelHistory].filter(item => {
    if (!item?.value) return false;
    if (seen.has(item.value)) return false;
    seen.add(item.value);
    return true;
  });

  pools[type.name] = shuffle(combined);

  console.log(
    `[AUTO MEDIA] ${type.name} pool rebuilt: ${combined.length} images ` +
    `(local ${localFiles.length}, sources ${sourceUrls.length}, channel ${channelHistory.length})`
  );

  return pools[type.name];
}

async function sendAsUploadFromUrl(channel, typeName, label, imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 skid-discord-bot',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  }).catch(() => null);

  if (!response || !response.ok) return false;

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) return false;

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 2500 || buffer.length > 8 * 1024 * 1024) return false;

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

async function sendLocalFile(channel, type, filePath) {
  await channel.send({
    content: `⌁ ${type.label}`,
    files: [new AttachmentBuilder(filePath)],
  });

  return true;
}

async function postFromPool(client, channel, type) {
  let pool = pools[type.name] || [];

  if (!pool.length) {
    pool = await buildPool(client, type);
  }

  if (!pool.length) {
    console.log(
      `[AUTO MEDIA] No curated ${type.name} available. ` +
      `Add images to ${type.folder}, ${type.urlsFile}, or manually post images in that channel.`
    );
    return false;
  }

  let candidates = pool.filter(item => {
    if (item.value === lastPosted[type.name]) return false;
    return !hasBeenUsed(type.name, item.value);
  });

  if (!candidates.length) {
    resetUsedForType(type.name);
    await buildPool(client, type);
    pool = pools[type.name] || [];

    candidates = pool.filter(item => item.value !== lastPosted[type.name]);
    if (!candidates.length) candidates = pool;
  }

  const shuffled = shuffle(candidates);

  for (const selected of shuffled.slice(0, 20)) {
    let ok = false;

    if (selected.kind === 'local') {
      ok = await sendLocalFile(channel, type, selected.value).catch(() => false);
    } else {
      ok = await sendAsUploadFromUrl(channel, type.name, type.label, selected.value).catch(() => false);
    }

    if (ok) {
      lastPosted[type.name] = selected.value;
      markUsed(type.name, selected.value);
      console.log(`[AUTO MEDIA] Posted ${type.name} from curated pool.`);
      return true;
    }
  }

  console.log(`[AUTO MEDIA] Failed to post any ${type.name} candidate from pool.`);
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
    },
    {
      name: 'banners',
      label: 'banner',
      channelId: config.channels.banners,
      folder: './assets/banners',
      urlsFile: './sources/banners.txt',
    },
  ].filter(type => type.channelId);
}

async function postOne(client) {
  const types = getMediaTypes();

  if (!types.length) {
    console.log('[AUTO MEDIA] No pfp/banner channels configured.');
    return;
  }

  const type = types[typeIndex % types.length];
  typeIndex++;

  const channel = await client.channels.fetch(type.channelId).catch(() => null);
  if (!channel) {
    console.log(`[AUTO MEDIA] Channel not found for ${type.name}: ${type.channelId}`);
    return;
  }

  await postFromPool(client, channel, type);
}

function startMediaPoster(client) {
  if (started) return;

  if (config.mediaPoster?.enabled === false) {
    console.log('[AUTO MEDIA] Disabled in config.');
    return;
  }

  started = true;

  console.log(`[AUTO MEDIA] Curated mode started. Posting every ${getIntervalMs()}ms.`);

  setTimeout(async () => {
    for (const type of getMediaTypes()) {
      await buildPool(client, type).catch(error => {
        console.log(`[AUTO MEDIA] Could not build ${type.name} pool: ${error.message}`);
      });
    }

    await postOne(client).catch(console.error);
  }, 5000);

  setInterval(() => {
    postOne(client).catch(console.error);
  }, getIntervalMs());
}

module.exports = {
  startMediaPoster,
};
