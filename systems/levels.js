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
  let row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);

  if (!row) {
    db.prepare(`
      INSERT INTO levels (guild_id, user_id, xp, level, last_message_xp)
      VALUES (?, ?, 0, 0, 0)
    `).run(guildId, userId);

    row = db.prepare('SELECT * FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
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

function rewardRolesForLevel(level) {
  return [
    { level: 10, role: config.roles.level10 },
    { level: 20, role: config.roles.level20 },
    { level: 40, role: config.roles.level40 },
    { level: 50, role: config.roles.level50 },
    { level: 100, role: config.roles.level100 },
    { level: 1000, role: config.roles.level1000 },

    { level: 10, role: config.roles.verified },
    { level: 20, role: config.roles.trusted },
    { level: 40, role: config.roles.known },
    { level: 50, role: config.roles.proven },
    { level: 100, role: config.roles.elite },
    { level: 1000, role: config.roles.ascendant },
  ].filter(reward => level >= reward.level && reward.role);
}

function getRewardText(level) {
  if (level >= 1000) return '⟡ Ascendant unlocked.';
  if (level >= 100) return '♱ Elite unlocked.';
  if (level >= 50) return '⛧ Proven unlocked.';
  if (level >= 40) return '⟠ Known unlocked.';
  if (level >= 20) return '⟡ Trusted unlocked.';
  if (level >= 10) return '⟐ Verified unlocked.';
  return 'Keep climbing.';
}

async function giveLevelRoles(member, level) {
  if (!member?.roles) return;

  for (const reward of rewardRolesForLevel(level)) {
    if (!member.roles.cache.has(reward.role)) {
      await member.roles.add(reward.role).catch(error => {
        console.log(`[LEVELS] Could not add role ${reward.role} to ${member.user.tag}: ${error.message}`);
      });
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
      { name: 'Member', value: `${member.user.tag}`, inline: true },
      { name: 'Reward', value: getRewardText(level), inline: false }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setFooter({ text: '/ritual' })
    .setTimestamp();

  if (config.images?.levelUp) embed.setImage(config.images.levelUp);

  await channel.send({
    content: `${member}`,
    embeds: [embed],
    allowedMentions: { users: [member.id] },
  }).catch(console.error);
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

  await giveLevelRoles(member, newLevel);

  if (newLevel > oldLevel) {
    await announceLevelUp(guild, member, newLevel, source);
  }
}

async function setUserLevel(guild, member, level, source = 'Staff Level Update') {
  const newLevel = Math.max(0, level);
  const newXp = xpForLevel(newLevel);

  getUser(guild.id, member.id);

  db.prepare(`
    UPDATE levels
    SET xp = ?, level = ?
    WHERE guild_id = ? AND user_id = ?
  `).run(newXp, newLevel, guild.id, member.id);

  await giveLevelRoles(member, newLevel);
  await announceLevelUp(guild, member, newLevel, source);

  return { xp: newXp, level: newLevel };
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

  await giveLevelRoles(message.member, newLevel);

  if (newLevel > oldLevel) {
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
  setUserLevel,
  giveLevelRoles,
  announceLevelUp,
  xpForLevel,
};
