const fs = require('node:fs');
const path = require('node:path');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const Database = require('better-sqlite3');
const config = require('../config');

const db = new Database('./database.sqlite');

db.prepare(`
  CREATE TABLE IF NOT EXISTS media_seen (
    url TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    posted_at INTEGER NOT NULL
  )
`).run();

let categoryIndex = 0;

function isValidImageUrl(url) {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp)$/.test(clean);
}

function getLocalFiles(folder) {
  if (!folder || !fs.existsSync(folder)) return [];
  return fs.readdirSync(folder)
    .filter(file => /\.(png|jpe?g|gif|webp)$/i.test(file))
    .map(file => path.join(folder, file));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getRemoteImage(category) {
  const subs = category.subreddits || [];
  const shuffled = [...subs].sort(() => Math.random() - 0.5);

  for (const sub of shuffled) {
    try {
      const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/hot.json?limit=75`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'skid-discord-bot/1.0',
          'Accept': 'application/json',
        },
      });

      if (!res.ok) continue;
      const data = await res.json();
      const posts = data?.data?.children || [];

      const candidates = posts
        .map(p => p.data)
        .filter(p => !p.over_18)
        .map(p => p.url_overridden_by_dest || p.url)
        .filter(isValidImageUrl)
        .filter(u => !db.prepare('SELECT url FROM media_seen WHERE url = ?').get(u));

      if (candidates.length) return pickRandom(candidates);
    } catch (err) {
      console.error(`[MEDIA] Failed fetching r/${sub}:`, err.message);
    }
  }

  return null;
}

async function attachmentFromUrl(url, categoryName) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'skid-discord-bot/1.0' },
  });

  if (!res.ok) throw new Error(`Bad media response ${res.status}`);

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > 7_500_000) {
    throw new Error('Image too large for safe upload.');
  }

  const ext = (url.split('?')[0].match(/\.(png|jpg|jpeg|gif|webp)$/i)?.[1] || 'png').toLowerCase();
  return new AttachmentBuilder(buffer, { name: `${categoryName}-${Date.now()}.${ext}` });
}

async function postCategory(client, category) {
  if (!category.channelId) return;

  const channel = await client.channels.fetch(category.channelId).catch(() => null);
  if (!channel) return;

  const localFiles = getLocalFiles(category.folder);
  let attachment = null;
  let sourceUrl = null;

  if (localFiles.length) {
    attachment = new AttachmentBuilder(pickRandom(localFiles));
  } else {
    sourceUrl = await getRemoteImage(category);
    if (!sourceUrl) return;
    attachment = await attachmentFromUrl(sourceUrl, category.name);
  }

  const embed = new EmbedBuilder()
    .setTitle(category.title || 'Drop')
    .setColor(config.colors.darkRed || config.colors.red)
    .setDescription('Fresh pull.')
    .setImage(`attachment://${attachment.name}`)
    .setFooter({ text: '/ritual' })
    .setTimestamp();

  await channel.send({ embeds: [embed], files: [attachment] }).catch(console.error);

  if (sourceUrl) {
    db.prepare(`
      INSERT OR IGNORE INTO media_seen (url, category, posted_at)
      VALUES (?, ?, ?)
    `).run(sourceUrl, category.name, Date.now());
  }
}

async function postNextMedia(client) {
  if (!config.mediaAuto?.enabled) return;

  const categories = (config.mediaAuto.categories || []).filter(c => c.channelId);
  if (!categories.length) return;

  const category = categories[categoryIndex % categories.length];
  categoryIndex++;

  await postCategory(client, category);
}

function startMediaPoster(client) {
  if (!config.mediaAuto?.enabled) return;

  setTimeout(() => postNextMedia(client).catch(console.error), 15_000);

  setInterval(() => {
    postNextMedia(client).catch(console.error);
  }, config.mediaAuto.intervalMs || 600_000);
}

module.exports = {
  startMediaPoster,
  postNextMedia,
};
