const fs = require('node:fs');
const path = require('node:path');

const OUTPUTS = {
  pfps: './sources/pfps.txt',
  banners: './sources/banners.txt',
};

const SOURCE_PAGES = {
  pfps: [
    'https://pfps.gg/',
    'https://pfps.gg/search',
    'https://pfps.gg/search?q=dark',
    'https://pfps.gg/search?q=black',
    'https://pfps.gg/search?q=aesthetic',
    'https://pfps.gg/search?q=anime',
    'https://pfps.gg/search?q=goth',
    'https://pfps.gg/search?q=grunge',
    'https://pfps.gg/search?q=emo',
    'https://pfps.gg/search?q=matching',
  ],
  banners: [
    'https://pfps.gg/banners/cool',
    'https://pfps.gg/banners',
    'https://pfps.gg/search?q=cool%20banner',
    'https://pfps.gg/search?q=dark%20banner',
    'https://pfps.gg/search?q=anime%20banner',
    'https://pfps.gg/search?q=aesthetic%20banner',
    'https://pfps.gg/search?q=matching%20banner',
    'https://pfps.gg/search?q=red%20banner',
  ],
};

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

function looksBad(url) {
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
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      Referer: 'https://pfps.gg/',
    },
  });

  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

  return res.text();
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
      if (looksBad(url)) continue;

      found.add(url);
    }
  }

  return [...found];
}

function extractPostLinks(html, baseUrl, typeName) {
  const found = new Set();
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(match => match[1]);

  for (const href of hrefs) {
    const url = normalizeUrl(href, baseUrl);
    if (!url) continue;

    const lower = url.toLowerCase();

    if (typeName === 'pfps' && lower.includes('/pfp/')) found.add(url);
    if (typeName === 'banners' && lower.includes('/banner/')) found.add(url);
  }

  return [...found];
}

async function scrapeType(typeName) {
  const images = new Set();

  for (const pageUrl of SOURCE_PAGES[typeName]) {
    try {
      console.log(`[${typeName}] scanning ${pageUrl}`);
      const html = await fetchHtml(pageUrl);

      for (const img of extractImageUrls(html, pageUrl)) images.add(img);

      const posts = extractPostLinks(html, pageUrl, typeName).slice(0, 60);

      for (const postUrl of posts) {
        try {
          const postHtml = await fetchHtml(postUrl);
          for (const img of extractImageUrls(postHtml, postUrl)) images.add(img);

          if (images.size >= 200) break;
        } catch (error) {
          console.log(`[${typeName}] skipped post ${postUrl}: ${error.message}`);
        }
      }

      if (images.size >= 200) break;
    } catch (error) {
      console.log(`[${typeName}] skipped page ${pageUrl}: ${error.message}`);
    }
  }

  return [...images];
}

async function main() {
  ensureDir(OUTPUTS.pfps);
  ensureDir(OUTPUTS.banners);

  for (const typeName of ['pfps', 'banners']) {
    const existing = fs.existsSync(OUTPUTS[typeName])
      ? fs
          .readFileSync(OUTPUTS[typeName], 'utf8')
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean)
      : [];

    const scraped = await scrapeType(typeName);
    const combined = [...new Set([...existing, ...scraped])];

    fs.writeFileSync(OUTPUTS[typeName], `${combined.join('\n')}\n`, 'utf8');

    console.log(`[${typeName}] wrote ${combined.length} URLs to ${OUTPUTS[typeName]}`);
  }

  console.log('Done. Commit sources/pfps.txt and sources/banners.txt, then push to Render.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
