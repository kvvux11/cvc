const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');
const config = require('../config');

let started = false;
let typeIndex = 0;

const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const historyPath = './sources/media-history.json';

function getIntervalMs() {
  return config.mediaPoster?.intervalMs || 5000;
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

function hasBeenUsed(typeName, value) {
  const history = readHistory();
  return Array.isArray(history[typeName]) && history[typeName].includes(value);
}

function markUsed(typeName, value) {
  const history = readHistory();
  if (!Array.isArray(history[typeName])) history[typeName] = [];

  history[typeName].push(value);
  history[typeName] = [...new Set(history[typeName])].slice(-250);

  writeHistory(history);
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
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

function isImageUrl(url) {
  return /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(url);
}

function cleanUrl(url) {
  return String(url || '')
    .replaceAll('&amp;', '&')
    .replaceAll('\\/', '/')
    .trim();
}

function normalizeUrl(raw, baseUrl) {
  let url = cleanUrl(raw);
  if (!url) return null;

  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('/')) url = new URL(url, baseUrl).toString();
  if (!/^https?:\/\//i.test(url)) return null;

  return url;
}

function imageLooksBad(url) {
  const lower = url.toLowerCase();

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

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 skid-discord-bot',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      Referer: 'https://pfps.gg/',
    },
  }).catch(() => null);

  if (!res || !res.ok) return null;
  return res.text().catch(() => null);
}

function extractImageUrls(html, baseUrl) {
  const found = new Set();

  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi,
    /(?:src|data-src|data-lazy-src)=["']([^"']+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^"']*)?)["']/gi,
    /(https?:\/\/[^"' <>()]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^"' <>()]*)?)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1] || match[0];
      const url = normalizeUrl(raw, baseUrl);

      if (!url) continue;
      if (imageLooksBad(url)) continue;

      found.add(url);
    }
  }

  return [...found];
}

function extractPostLinks(html, baseUrl, typeName) {
  const links = new Set();
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1]);

  for (const href of hrefs) {
    const full = normalizeUrl(href, baseUrl);
    if (!full) continue;

    const lower = full.toLowerCase();

    if (typeName === 'pfps' && lower.includes('/pfp/')) links.add(full);
    if (typeName === 'banners' && lower.includes('/banner/')) links.add(full);
  }

  return [...links];
}

function getSourcePages(type) {
  if (type.name === 'banners') {
    return [
      'https://pfps.gg/banners/cool',
      'https://pfps.gg/banners',
      'https://pfps.gg/search?q=cool%20banner',
      'https://pfps.gg/search?q=dark%20cool%20banner',
      'https://pfps.gg/search?q=anime%20banner',
      'https://pfps.gg/search?q=aesthetic%20banner',
      'https://pfps.gg/search?q=matching%20banner',
      'https://pfps.gg/search?q=red%20banner',
    ];
  }

  return [
    'https://pfps.gg/',
    'https://pfps.gg/search',
    'https://pfps.gg/search?q=dark',
    'https://pfps.gg/search?q=black',
    'https://pfps.gg/search?q=aesthetic',
    'https://pfps.gg/search?q=anime',
    'https://pfps.gg/search?q=goth',
    'https://pfps.gg/search?q=grunge',
    'https://pfps.gg/search?q=emo',
  ];
}

async function scrapePfpsSource(type) {
  const images = new Set();

  for (const pageUrl of getSourcePages(type)) {
    const html = await fetchHtml(pageUrl);
    if (!html) continue;

    for (const img of extractImageUrls(html, pageUrl)) {
      images.add(img);
    }

    const postLinks = extractPostLinks(html, pageUrl, type.name);

    for (const postUrl of shuffle(postLinks).slice(0, 30)) {
      const postHtml = await fetchHtml(postUrl);
      if (!postHtml) continue;

      for (const img of extractImageUrls(postHtml, postUrl)) {
        images.add(img);
      }

      if (images.size >= 100) break;
    }

    if (images.size >= 100) break;
  }

  return [...images];
}

async function fetchDiscordChannelImages(client, type) {
  const channel = await client.channels.fetch(type.channelId).catch(() => null);
  if (!channel?.messages?.fetch) return [];

  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return [];

  const urls = new Set();

  for (const message of messages.values()) {
    for (const attachment of message.attachments.values()) {
      if (attachment?.contentType?.startsWith('image/') || isImageUrl(attachment.url)) {
        urls.add(attachment.url);
      }
    }

    for (const embed of message.embeds || []) {
      if (embed.image?.url && isImageUrl(embed.image.url)) urls.add(embed.image.url);
      if (embed.thumbnail?.url && isImageUrl(embed.thumbnail.url)) urls.add(embed.thumbnail.url);
    }
  }

  return [...urls];
}

async function sendAsUploadFromUrl(channel, typeName, label, imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 skid-discord-bot',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: 'https://pfps.gg/',
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

async function sendLocalMedia(channel, type) {
  const files = getLocalFiles(type.folder);
  if (!files.length) return false;

  const unused = shuffle(files).filter(file => !hasBeenUsed(type.name, file));
  const selected = unused[0] || shuffle(files)[0];

  if (!selected) return false;

  await channel.send({
    content: `⌁ ${type.label}`,
    files: [new AttachmentBuilder(selected)],
  });

  markUsed(type.name, selected);
  return true;
}

async function sendFromUrls(channel, type, urls, sourceName) {
  if (!urls.length) return false;

  const clean = [...new Set(urls)]
    .filter(Boolean)
    .filter(url => !imageLooksBad(url));

  const unused = shuffle(clean).filter(url => !hasBeenUsed(type.name, url));
  const candidates = unused.length ? unused : shuffle(clean);

  for (const selected of candidates.slice(0, 25)) {
    const ok = await sendAsUploadFromUrl(channel, type.name, type.label, selected).catch(() => false);

    if (ok) {
      markUsed(type.name, selected);
      console.log(`[AUTO MEDIA] Posted ${type.name} from ${sourceName}.`);
      return true;
    }
  }

  return false;
}

async function sendCuratedMedia(channel, type) {
  const urls = getCuratedUrls(type.urlsFile);
  return sendFromUrls(channel, type, urls, 'sources txt');
}

async function sendDiscordHistoryMedia(client, channel, type) {
  const urls = await fetchDiscordChannelImages(client, type).catch(() => []);
  console.log(`[AUTO MEDIA] ${type.name} found ${urls.length} images in channel history.`);
  return sendFromUrls(channel, type, urls, 'channel history');
}

async function sendScrapedMedia(channel, type) {
  const scraped = await scrapePfpsSource(type).catch(error => {
    console.log(`[AUTO MEDIA] scrape error for ${type.name}: ${error.message}`);
    return [];
  });

  console.log(`[AUTO MEDIA] ${type.name} scraped ${scraped.length} candidates.`);
  return sendFromUrls(channel, type, scraped, 'pfps.gg');
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

  try {
    let posted = false;

    posted = await sendLocalMedia(channel, type);
    if (!posted) posted = await sendCuratedMedia(channel, type);
    if (!posted) posted = await sendDiscordHistoryMedia(client, channel, type);
    if (!posted) posted = await sendScrapedMedia(channel, type);

    if (!posted) {
      console.log(`[AUTO MEDIA] Nothing available for ${type.name}. Add images to assets, sources txt, or post some in the channel first.`);
      return;
    }

    console.log(`[AUTO MEDIA] Posted ${type.name}`);
  } catch (error) {
    console.error(`[AUTO MEDIA] Failed posting ${type.name}:`, error.message);
  }
}

function startMediaPoster(client) {
  if (started) return;

  if (config.mediaPoster?.enabled === false) {
    console.log('[AUTO MEDIA] Disabled in config.');
    return;
  }

  started = true;

  console.log(`[AUTO MEDIA] Started. Posting every ${getIntervalMs()}ms.`);

  setTimeout(() => {
    postOne(client).catch(console.error);
  }, 3000);

  setInterval(() => {
    postOne(client).catch(console.error);
  }, getIntervalMs());
}

module.exports = {
  startMediaPoster,
};
