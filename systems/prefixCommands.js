const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const config = require('../config');
const {
  canUseOwner,
  canUseAdmin,
  canUseMod,
  canUseTrialMod,
} = require('./permissions');
const {
  getProfile,
  getLeaderboard,
  xpForLevel,
  setUserLevel,
} = require('./levels');
const {
  ticketPanelEmbed,
  reportPanelEmbed,
  applicationPanelEmbed,
  ticketButtons,
  reportButtons,
  applicationButtons,
} = require('./tickets');
const { logModeration } = require('./logger');

const eightBallAnswers = ['yes', 'no', 'probably', 'not even close', 'looks likely', 'ask again later', '100%', 'never'];
const wyr = [
  'lose your account or lose your whole friend group?',
  'be known but hated or unknown but respected?',
  'never sleep again or never speak again?',
  'have unlimited money but no privacy or privacy but stay broke?',
  'be feared or be trusted?',
];
const truths = [
  'what is something you pretend not to care about?',
  'who in here gives fake energy?',
  'what is your worst habit?',
  'what is one thing you would never admit in public?',
];
const dares = [
  'send the last image in your camera roll.',
  'change your nickname for 10 minutes.',
  'join VC and say nothing for 60 seconds.',
  'ping a friend and say “you are cooked”.',
];

function parseTarget(message, raw) {
  if (!raw) return null;
  const mention = message.mentions.members.first();
  if (mention) return mention;
  const id = raw.replace(/[<@!>]/g, '');
  if (!/^\d+$/.test(id)) return null;
  return message.guild.members.cache.get(id) || null;
}

function embed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(config.colors.darkRed || config.colors.red)
    .setFooter({ text: 'skid • /ritual' })
    .setTimestamp();
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handlePrefixCommand(message, client) {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return false;

  const raw = message.content.slice(config.prefix.length).trim();
  if (!raw.length) return false;

  const args = raw.split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    return message.reply({
      embeds: [embed('skid commands', [
        '**member**',
        '`.help` `.ping` `.level` `.profile` `.leaderboard` `.avatar` `.userinfo` `.serverinfo` `.membercount`',
        '',
        '**fun**',
        '`.8ball` `.coinflip` `.choose` `.rate` `.vibecheck` `.aura` `.ship` `.roast` `.compliment` `.truth` `.dare` `.wyr` `.mood` `.sus` `.respect` `.ratio`',
        '',
        '**staff**',
        '`.timeout` `.clear` `.lock` `.unlock` `.slowmode` `.kick` `.ban` `.addlevel` `.removelevel`',
        '',
        '**owner**',
        '`.say` `.ticketpanel` `.reportpanel` `.applicationpanel`',
      ].join('\n'))],
    });
  }

  if (command === 'ping') return message.reply(`pong — **${client.ws.ping}ms**`);

  if (command === 'level' || command === 'profile') {
    const member = message.mentions.members.first() || message.member;
    const p = getProfile(message.guild.id, member.id);
    const next = xpForLevel(p.level + 1);

    return message.reply({
      embeds: [embed(`${member.user.username}`, `**Level:** ${p.level}\n**XP:** ${p.xp}/${next}`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))],
    });
  }

  if (command === 'leaderboard') {
    const rows = getLeaderboard(message.guild.id, 10);
    const text = rows.length
      ? rows.map((r, i) => `**${i + 1}.** <@${r.user_id}> — Level ${r.level} | ${r.xp} XP`).join('\n')
      : 'no levels yet.';
    return message.reply({ embeds: [embed('leaderboard', text)] });
  }

  if (command === 'avatar') {
    const member = message.mentions.members.first() || message.member;
    return message.reply({
      embeds: [embed(`${member.user.username}'s avatar`, ' ')
        .setImage(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))],
    });
  }

  if (command === 'userinfo') {
    const member = message.mentions.members.first() || message.member;
    return message.reply({
      embeds: [embed(member.user.tag,
        `**ID:** ${member.id}\n**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`)],
    });
  }

  if (command === 'serverinfo') {
    await message.guild.members.fetch().catch(() => {});
    const humans = message.guild.members.cache.filter(m => !m.user.bot).size;
    const bots = message.guild.members.cache.filter(m => m.user.bot).size;
    return message.reply({ embeds: [embed(message.guild.name, `**Members:** ${humans}\n**Bots:** ${bots}\n**Roles:** ${message.guild.roles.cache.size}`)] });
  }

  if (command === 'membercount') {
    await message.guild.members.fetch().catch(() => {});
    const humans = message.guild.members.cache.filter(m => !m.user.bot).size;
    return message.reply({ embeds: [embed('membercount', `**${humans}** members`)] });
  }

  if (command === 'coinflip') return message.reply(Math.random() < 0.5 ? 'heads' : 'tails');
  if (command === '8ball') return message.reply(rand(eightBallAnswers));
  if (command === 'choose') return message.reply(args.join(' ').split('|').map(x => x.trim()).filter(Boolean).length ? rand(args.join(' ').split('|').map(x => x.trim()).filter(Boolean)) : 'use `.choose option 1 | option 2`');
  if (command === 'rate') return message.reply(`${args.join(' ') || 'that'} gets **${Math.floor(Math.random() * 101)}/100**`);
  if (command === 'vibecheck') return message.reply(`${message.mentions.users.first() || message.author} is **${Math.floor(Math.random() * 101)}%** vibe.`);
  if (command === 'aura') return message.reply(`${message.mentions.users.first() || message.author} has **${Math.floor(Math.random() * 2001) - 1000} aura**.`);
  if (command === 'ship') return message.reply(`compatibility: **${Math.floor(Math.random() * 101)}%**`);
  if (command === 'roast') return message.reply(`${message.mentions.users.first() || message.author} you look like your phone autocorrects you to “mistake”.`);
  if (command === 'compliment') return message.reply(`${message.mentions.users.first() || message.author} lowkey you carry the room.`);
  if (command === 'truth') return message.reply(rand(truths));
  if (command === 'dare') return message.reply(rand(dares));
  if (command === 'wyr' || command === 'wouldyourather') return message.reply(`would you rather ${rand(wyr)}`);
  if (command === 'mood') return message.reply(`today's mood: **${rand(['locked in', 'offline', 'dangerous', 'quiet', 'unreadable', 'spiraling', 'clean'])}**`);
  if (command === 'sus') return message.reply(`${message.mentions.users.first() || message.author} is **${Math.floor(Math.random() * 101)}%** suspicious.`);
  if (command === 'respect') return message.reply(`${message.mentions.users.first() || message.author} has **${Math.floor(Math.random() * 101)}%** respect.`);
  if (command === 'ratio') return message.reply(Math.random() > 0.5 ? 'ratio accepted.' : 'ratio failed. embarrassing.');

  if (command === 'ticketpanel') {
    if (!canUseOwner(message.member)) return message.reply('owner only.');
    const ch = await message.guild.channels.fetch(config.channels.tickets).catch(() => null);
    if (!ch) return message.reply('tickets channel missing.');
    await ch.send({ embeds: [ticketPanelEmbed()], components: ticketButtons() });
    return message.reply('posted.');
  }

  if (command === 'reportpanel') {
    if (!canUseOwner(message.member)) return message.reply('owner only.');
    const ch = await message.guild.channels.fetch(config.channels.reportsPanel).catch(() => null);
    if (!ch) return message.reply('reports channel missing.');
    await ch.send({ embeds: [reportPanelEmbed()], components: [reportButtons()] });
    return message.reply('posted.');
  }

  if (command === 'applicationpanel') {
    if (!canUseOwner(message.member)) return message.reply('owner only.');
    const ch = await message.guild.channels.fetch(config.channels.applications).catch(() => null);
    if (!ch) return message.reply('applications channel missing.');
    await ch.send({ embeds: [applicationPanelEmbed()], components: [applicationButtons()] });
    return message.reply('posted.');
  }

  if (command === 'say') {
    if (!canUseOwner(message.member)) return message.reply('owner only.');
    const text = args.join(' ');
    if (!text) return message.reply('say what?');
    await message.channel.send(text);
    await message.delete().catch(() => {});
    return true;
  }

  if (command === 'clear') {
    if (!canUseTrialMod(message.member)) return message.reply('trial+ only.');
    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > 100) return message.reply('use `.clear 20`');
    await message.channel.bulkDelete(amount, true).catch(() => {});
    return message.reply(`deleted **${amount}** messages.`).then(m => setTimeout(() => m.delete().catch(() => {}), 2500));
  }

  if (command === 'timeout') {
    if (!canUseTrialMod(message.member)) return message.reply('trial+ only.');
    const target = parseTarget(message, args.shift());
    const durationRaw = args.shift();
    const duration = ms(durationRaw || '');
    const reason = args.join(' ') || 'No reason provided.';
    if (!target || !duration || duration > ms('28d')) return message.reply('use `.timeout @user 10m reason`');
    if (!target.moderatable) return message.reply('I cannot timeout them.');
    await target.timeout(duration, reason);
    await target.send(`You were timed out in **${message.guild.name}** for **${durationRaw}**.\nReason: ${reason}`).catch(() => {});
    await logModeration(client, 'Member Timed Out', [
      { name: 'User', value: target.user.tag, inline: true },
      { name: 'Staff', value: message.author.tag, inline: true },
      { name: 'Reason', value: reason },
    ]);
    return message.reply(`timed out **${target.user.tag}** for **${durationRaw}**`);
  }

  if (command === 'kick') {
    if (!canUseMod(message.member)) return message.reply('enforcer+ only.');
    const target = parseTarget(message, args.shift());
    const reason = args.join(' ') || 'No reason provided.';
    if (!target || !target.kickable) return message.reply('cannot kick them.');
    await target.kick(reason);
    return message.reply(`kicked **${target.user.tag}**`);
  }

  if (command === 'ban') {
    if (!canUseAdmin(message.member)) return message.reply('warden+ only.');
    const raw = args.shift();
    const id = raw?.replace(/[<@!>]/g, '');
    const reason = args.join(' ') || 'No reason provided.';
    if (!id || !/^\d+$/.test(id)) return message.reply('use `.ban userId reason`');
    await message.guild.members.ban(id, { reason }).catch(() => null);
    return message.reply(`banned **${id}**`);
  }

  if (command === 'lock') {
    if (!canUseMod(message.member)) return message.reply('enforcer+ only.');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
    return message.reply('locked.');
  }

  if (command === 'unlock') {
    if (!canUseMod(message.member)) return message.reply('enforcer+ only.');
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null });
    return message.reply('unlocked.');
  }

  if (command === 'slowmode') {
    if (!canUseTrialMod(message.member)) return message.reply('trial+ only.');
    const seconds = parseInt(args[0], 10);
    if (Number.isNaN(seconds) || seconds < 0 || seconds > 21600) return message.reply('use `.slowmode 5`');
    await message.channel.setRateLimitPerUser(seconds);
    return message.reply(`slowmode set to **${seconds}s**`);
  }

  if (command === 'addlevel' || command === 'removelevel') {
    if (!canUseMod(message.member)) return message.reply('enforcer+ only.');
    const target = parseTarget(message, args.shift());
    const amount = parseInt(args.shift(), 10);
    if (!target || !amount || amount < 1) return message.reply(`use \`.${command} @user 5\``);
    const profile = getProfile(message.guild.id, target.id);
    const next = command === 'addlevel' ? profile.level + amount : Math.max(0, profile.level - amount);
    await setUserLevel(message.guild, target, next, 'Staff Level Update');
    return message.reply(`${target} is now **Level ${next}**.`);
  }

  return false;
}

module.exports = {
  handlePrefixCommand,
};
