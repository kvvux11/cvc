const Database = require('better-sqlite3');
const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const db = new Database('./database.sqlite');

db.prepare(`
  CREATE TABLE IF NOT EXISTS levels (
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    last_message_xp INTEGER DEFAULT 0,
    PRIMARY KEY (guild_id, user_id)
  )
`).run();

function getUser(guildId, userId) {
  let row = db
    .prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?')
    .get(guildId, userId);

  if (!row) {
    db.prepare(`
      INSERT INTO levels (guild_id, user_id, xp, level, last_message_xp)
      VALUES (?, ?, 0, 0, 0)
    `).run(guildId, userId);

    row = db
      .prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?')
      .get(guildId, userId);
  }

  return row;
}

function xpForLevel(level) {
  return 100 * level * level;
}

function calculateLevel(xp) {
  let level = 0;

  while (xp >= xpForLevel(level + 1)) {
    level++;
  }

  return level;
}

async function giveLevelRoles(member, level) {
  if (!member) return;

  const rewards = [
    { level: 10, role: config.roles.level10 },
    { level: 20, role: config.roles.level20 },
    { level: 40, role: config.roles.level40 },
    { level: 50, role: config.roles.level50 },
    { level: 100, role: config.roles.level100 },
    { level: 1000, role: config.roles.level1000 },
  ];

  for (const reward of rewards) {
    if (level >= reward.level && !member.roles.cache.has(reward.role)) {
      await member.roles.add(reward.role).catch(() => {});
    }
  }
}

async function announceLevelUp(guild, member, level, source = 'Chat') {
  const channel = await guild.channels.fetch(config.channels.levels).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Level Up')
    .setColor(config.colors.red)
    .setDescription(`${member} just hit **Level ${level}**`)
    .addFields(
      { name: 'Source', value: source, inline: true },
      { name: 'Member', value: `${member.user.tag}`, inline: true }
    )
    .setImage(config.images.levelUp)
    .setFooter({ text: 'Cruel Violations Customs' })
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function awardXp(guild, member, amount, source = 'Chat') {
  if (!guild || !member || member.user.bot) return;

  const user = getUser(guild.id, member.id);
  const oldLevel = user.level;
  const newXp = user.xp + amount;
  const newLevel = calculateLevel(newXp);

  db.prepare(`
    UPDATE levels
    SET xp = ?, level = ?
    WHERE guild_id = ? AND user_id = ?
  `).run(newXp, newLevel, guild.id, member.id);

  if (newLevel > oldLevel) {
    await giveLevelRoles(member, newLevel);
    await announceLevelUp(guild, member, newLevel, source);
  }
}

async function addMessageXp(message) {
  if (!message.guild || message.author.bot) return;

  const user = getUser(message.guild.id, message.author.id);
  const now = Date.now();

  if (now - user.last_message_xp < 60_000) return;

  const gain = Math.floor(Math.random() * 11) + 15;
  const oldLevel = user.level;
  const newXp = user.xp + gain;
  const newLevel = calculateLevel(newXp);

  db.prepare(`
    UPDATE levels
    SET xp = ?, level = ?, last_message_xp = ?
    WHERE guild_id = ? AND user_id = ?
  `).run(newXp, newLevel, now, message.guild.id, message.author.id);

  if (newLevel > oldLevel) {
    await giveLevelRoles(message.member, newLevel);
    await announceLevelUp(message.guild, message.member, newLevel, 'Chat');
  }
}

async function runVoiceXpSweep(client) {
  const guild = await client.guilds.fetch(config.guildId).catch(() => null);
  if (!guild) return;

  await guild.members.fetch().catch(() => {});

  const members = guild.members.cache.filter(member => {
    if (member.user.bot) return false;

    const voice = member.voice;
    if (!voice?.channel) return false;
    if (voice.channelId === guild.afkChannelId) return false;

    const realUsersInChannel = voice.channel.members.filter(m => !m.user.bot).size;

    return realUsersInChannel >= 2;
  });

  for (const member of members.values()) {
    await awardXp(guild, member, 10, 'Voice Chat');
  }
}

function getProfile(guildId, userId) {
  return getUser(guildId, userId);
}

function getLeaderboard(guildId, limit = 10) {
  return db.prepare(`
    SELECT * FROM levels
    WHERE guild_id = ?
    ORDER BY xp DESC
    LIMIT ?
  `).all(guildId, limit);
}

function setXp(guildId, userId, xp) {
  const level = calculateLevel(xp);

  getUser(guildId, userId);

  db.prepare(`
    UPDATE levels
    SET xp = ?, level = ?
    WHERE guild_id = ? AND user_id = ?
  `).run(xp, level, guildId, userId);

  return { xp, level };
}

module.exports = {
  addMessageXp,
  awardXp,
  runVoiceXpSweep,
  getProfile,
  getLeaderboard,
  setXp,
  xpForLevel,
};