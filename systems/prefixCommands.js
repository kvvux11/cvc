const { EmbedBuilder } = require('discord.js');
const ms = require('ms');
const config = require('../config');
const {
  isStaff,
  canUseOwner,
  canUseAdmin,
  canUseMod,
  canUseTrialMod,
} = require('./permissions');
const {
  getProfile,
  getLeaderboard,
  xpForLevel,
  setXp,
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

const eightBallAnswers = [
  'yeah',
  'nah',
  'probably',
  'ask later',
  'looks good',
  'that sounds dumb ngl',
  '100%',
  'not happening',
];

const wouldYouRatherQuestions = [
  'only drive F1 wheel cars forever or only Benny builds forever?',
  'lose all your rare paints or lose all your rare plates?',
  'host free drops forever or never get another rare car?',
  'have one perfect garage or ten messy ones?',
  'only clean builds or only wild builds?',
];

function parseTarget(message, raw) {
  if (!raw) return null;

  const mention = message.mentions.members.first();
  if (mention) return mention;

  const id = raw.replace(/[<@!>]/g, '');
  if (!/^\d+$/.test(id)) return null;

  return message.guild.members.cache.get(id) || null;
}

function makeBasicEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(config.colors.red)
    .setFooter({ text: 'Cruel Violations Customs' })
    .setTimestamp();
}

async function handlePrefixCommand(message, client) {
  if (!message.content.startsWith(config.prefix) || message.author.bot) return false;

  const raw = message.content.slice(config.prefix.length).trim();
  if (!raw.length) return false;

  const args = raw.split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    const embed = makeBasicEmbed(
      'CVC Prefix Commands',
      [
        '**Community**',
        '`.help` `.ping` `.level` `.leaderboard` `.profile` `.userinfo` `.avatar` `.serverinfo` `.membercount`',
        '',
        '**Fun**',
        '`.coinflip` `.8ball` `.ratecar` `.violaterate` `.cleanordirty` `.garagevalue` `.wouldyourather` `.hotgarage`',
        '',
        '**Owner Only**',
        '`.ticketpanel` `.reportpanel` `.applicationpanel` `.say`',
        '',
        '**Staff**',
        '`.timeout` `.clear` `.kick` `.ban` `.drop` `.listcar` `.addlevel` `.removelevel`',
      ].join('\n')
    );

    await message.reply({ embeds: [embed] });
    return true;
  }

  if (command === 'ping') {
    await message.reply(`Pong — **${client.ws.ping}ms**`);
    return true;
  }

  if (command === 'level') {
    const member = message.mentions.members.first() || message.member;
    const profile = getProfile(message.guild.id, member.id);
    const nextXp = xpForLevel(profile.level + 1);

    const embed = makeBasicEmbed(
      `${member.user.username}'s Level`,
      `**Level:** ${profile.level}\n**XP:** ${profile.xp}/${nextXp}`
    );

    embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    await message.reply({ embeds: [embed] });
    return true;
  }

  if (command === 'leaderboard') {
    const rows = getLeaderboard(message.guild.id, 10);
    const text = rows.length
      ? rows.map((row, i) => `**${i + 1}.** <@${row.user_id}> — Level ${row.level} | ${row.xp} XP`).join('\n')
      : 'No leaderboard data yet.';

    await message.reply({ embeds: [makeBasicEmbed('CVC Leaderboard', text)] });
    return true;
  }

  if (command === 'profile') {
    const member = message.mentions.members.first() || message.member;
    const profile = getProfile(message.guild.id, member.id);
    const nextXp = xpForLevel(profile.level + 1);

    await message.reply({
      embeds: [
        makeBasicEmbed(
          `${member.user.username}'s CVC Profile`,
          `**Level:** ${profile.level}\n**XP:** ${profile.xp}/${nextXp}`
        ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      ]
    });

    return true;
  }

  if (command === 'serverinfo') {
    await message.guild.members.fetch().catch(() => {});

    const humans = message.guild.members.cache.filter(m => !m.user.bot).size;
    const bots = message.guild.members.cache.filter(m => m.user.bot).size;

    await message.reply({
      embeds: [
        makeBasicEmbed(
          message.guild.name,
          `**Members:** ${humans}\n**Bots:** ${bots}\n**Roles:** ${message.guild.roles.cache.size}`
        ).setThumbnail(message.guild.iconURL({ dynamic: true }))
      ]
    });

    return true;
  }

  if (command === 'userinfo') {
    const member = message.mentions.members.first() || message.member;

    await message.reply({
      embeds: [
        makeBasicEmbed(
          member.user.tag,
          `**User ID:** ${member.id}\n**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>\n**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
        ).setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      ]
    });

    return true;
  }

  if (command === 'avatar') {
    const member = message.mentions.members.first() || message.member;

    await message.reply({
      embeds: [
        makeBasicEmbed(`${member.user.username}'s Avatar`, ' ')
          .setImage(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
      ]
    });

    return true;
  }

  if (command === 'membercount') {
    await message.guild.members.fetch().catch(() => {});

    const humans = message.guild.members.cache.filter(m => !m.user.bot).size;
    const bots = message.guild.members.cache.filter(m => m.user.bot).size;

    await message.reply({
      embeds: [
        makeBasicEmbed(
          'CVC Member Count',
          `**Members:** ${humans}\n**Bots:** ${bots}\n**Total:** ${humans + bots}`
        )
      ]
    });

    return true;
  }

  if (command === 'coinflip') {
    await message.reply(Math.random() < 0.5 ? '🪙 Heads' : '🪙 Tails');
    return true;
  }

  if (command === '8ball') {
    const answer = eightBallAnswers[Math.floor(Math.random() * eightBallAnswers.length)];
    await message.reply(`🎱 ${answer}`);
    return true;
  }

  if (command === 'ratecar') {
    const car = args.join(' ') || 'that build';
    const rating = Math.floor(Math.random() * 11);

    await message.reply(`🚗 **${car}** gets a **${rating}/10**`);
    return true;
  }

  if (command === 'violaterate') {
    const thing = args.join(' ') || 'that';
    const rating = Math.floor(Math.random() * 101);

    await message.reply(`🚨 **${thing}** is a **${rating}% violation**`);
    return true;
  }

  if (command === 'cleanordirty') {
    const build = args.join(' ') || 'that build';
    const outcomes = [
      'clean as hell',
      'a bit dirty',
      'certified clean',
      'straight up dirty',
      'show car material',
      'needs work',
    ];

    const result = outcomes[Math.floor(Math.random() * outcomes.length)];

    await message.reply(`🚗 **${build}** is **${result}**`);
    return true;
  }

  if (command === 'garagevalue') {
    const value = Math.floor(Math.random() * 950_000_000) + 50_000_000;

    await message.reply(`💰 ${message.author} your garage is worth **$${value.toLocaleString()}**`);
    return true;
  }

  if (command === 'wouldyourather') {
    const pick = wouldYouRatherQuestions[Math.floor(Math.random() * wouldYouRatherQuestions.length)];

    await message.reply(`**Would you rather** ${pick}`);
    return true;
  }

  if (command === 'hotgarage') {
    const rating = Math.floor(Math.random() * 101);

    await message.reply(`🔥 ${message.author} your garage is **${rating}% heat**`);
    return true;
  }

  if (command === 'ticketpanel') {
    if (!canUseOwner(message.member)) {
      await message.reply('Only the owner can do that.');
      return true;
    }

    const channel = await message.guild.channels.fetch(config.channels.openTicket).catch(() => null);

    if (!channel) {
      await message.reply('Open-a-ticket channel not found.');
      return true;
    }

    await channel.send({
      embeds: [ticketPanelEmbed()],
      components: [ticketButtons()],
    });

    await message.reply('Ticket panel posted.');
    return true;
  }

  if (command === 'reportpanel') {
    if (!canUseOwner(message.member)) {
      await message.reply('Only the owner can do that.');
      return true;
    }

    const channel = await message.guild.channels.fetch(config.channels.reportUser).catch(() => null);

    if (!channel) {
      await message.reply('Report-a-user channel not found.');
      return true;
    }

    await channel.send({
      embeds: [reportPanelEmbed()],
      components: [reportButtons()],
    });

    await message.reply('Report panel posted.');
    return true;
  }

  if (command === 'applicationpanel' || command === 'apppanel' || command === 'staffapps') {
    if (!canUseOwner(message.member)) {
      await message.reply('Only the owner can do that.');
      return true;
    }

    const channel = await message.guild.channels.fetch(config.channels.staffApplications).catch(() => null);

    if (!channel) {
      await message.reply('Staff applications channel not found.');
      return true;
    }

    await channel.send({
      embeds: [applicationPanelEmbed()],
      components: [applicationButtons()],
    });

    await message.reply('Application panel posted.');
    return true;
  }

  if (command === 'drop') {
    const allowed = isStaff(message.member) || message.member.roles.cache.has(config.roles.verifiedHost);

    if (!allowed) {
      await message.reply('Only staff or Verified Hosts can use that.');
      return true;
    }

    const text = args.join(' ');

    if (!text) {
      await message.reply('Use it like: `.drop some message here`');
      return true;
    }

    const channel = await message.guild.channels.fetch(config.channels.carDrop).catch(() => null);

    if (!channel) {
      await message.reply('Car drop channel not found.');
      return true;
    }

    await channel.send({
      embeds: [
        makeBasicEmbed('Car Drop', text).addFields({
          name: 'Posted By',
          value: `${message.author}`,
        })
      ]
    });

    await message.reply('Drop posted.');
    return true;
  }

  if (command === 'listcar') {
    const allowed = isStaff(message.member) || message.member.roles.cache.has(config.roles.verifiedHost);

    if (!allowed) {
      await message.reply('Only staff or Verified Hosts can use that.');
      return true;
    }

    const joined = args.join(' ');
    const parts = joined.split('|').map(x => x.trim());

    if (parts.length < 5) {
      await message.reply('Use it like: `.listcar car | platform | mods | access | availability`');
      return true;
    }

    const [car, platform, mods, access, availability] = parts;
    const channel = await message.guild.channels.fetch(config.channels.carDrop).catch(() => null);

    if (!channel) {
      await message.reply('Car drop channel not found.');
      return true;
    }

    const embed = new EmbedBuilder()
      .setTitle('New Car Listing')
      .setColor(config.colors.red)
      .addFields(
        { name: 'Car', value: car, inline: true },
        { name: 'Platform', value: platform, inline: true },
        { name: 'Access', value: access, inline: true },
        { name: 'Mods/Features', value: mods },
        { name: 'Availability', value: availability },
        { name: 'Host', value: `${message.author}` }
      )
      .setFooter({ text: 'Cruel Violations Customs' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await message.reply('Car listing posted.');

    return true;
  }

  if (command === 'kick') {
    if (!canUseMod(message.member)) {
      await message.reply('Only moderators or above can do that.');
      return true;
    }

    const rawTarget = args.shift();
    const target = parseTarget(message, rawTarget);
    const reason = args.join(' ') || 'No reason provided.';

    if (!target) {
      await message.reply('Use it like: `.kick @user reason`');
      return true;
    }

    if (!target.kickable) {
      await message.reply('I cannot kick that member.');
      return true;
    }

    await target.send(`You were kicked from **${message.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
    await target.kick(reason);

    await logModeration(client, 'Member Kicked', [
      { name: 'User', value: `${target.user.tag}`, inline: true },
      { name: 'Moderator', value: `${message.author.tag}`, inline: true },
      { name: 'Reason', value: reason },
    ]);

    await message.reply(`Kicked **${target.user.tag}**`);
    return true;
  }

  if (command === 'ban') {
    if (!canUseAdmin(message.member)) {
      await message.reply('Only admins can do that.');
      return true;
    }

    const rawTarget = args.shift();
    const id = rawTarget?.replace(/[<@!>]/g, '');
    const reason = args.join(' ') || 'No reason provided.';

    if (!id || !/^\d+$/.test(id)) {
      await message.reply('Use it like: `.ban 123456789 reason` or `.ban @user reason`');
      return true;
    }

    const member = message.guild.members.cache.get(id) || null;

    if (member) {
      await member.send(`You were banned from **${message.guild.name}**.\n**Reason:** ${reason}`).catch(() => {});
    }

    await message.guild.members.ban(id, { reason }).catch(async () => {
      await message.reply('I could not ban that user.');
    });

    await logModeration(client, 'Member Banned', [
      { name: 'User ID', value: id, inline: true },
      { name: 'Admin', value: `${message.author.tag}`, inline: true },
      { name: 'Reason', value: reason },
    ]);

    await message.reply(`Banned **${id}**`);
    return true;
  }

  if (command === 'timeout') {
    if (!canUseTrialMod(message.member)) {
      await message.reply('Only trial moderators or above can do that.');
      return true;
    }

    const rawTarget = args.shift();
    const durationRaw = args.shift();
    const target = parseTarget(message, rawTarget);
    const duration = ms(durationRaw || '');
    const reason = args.join(' ') || 'No reason provided.';

    if (!target || !durationRaw) {
      await message.reply('Use it like: `.timeout @user 10m reason`');
      return true;
    }

    if (!duration || duration > ms('28d')) {
      await message.reply('Use a valid duration under 28d. Example: `10m`, `1h`, `1d`');
      return true;
    }

    if (!target.moderatable) {
      await message.reply('I cannot timeout that member.');
      return true;
    }

    await target.send(`You were timed out in **${message.guild.name}**.\n**Duration:** ${durationRaw}\n**Reason:** ${reason}`).catch(() => {});
    await target.timeout(duration, reason);

    await logModeration(client, 'Member Timed Out', [
      { name: 'User', value: `${target.user.tag}`, inline: true },
      { name: 'Moderator', value: `${message.author.tag}`, inline: true },
      { name: 'Duration', value: durationRaw, inline: true },
      { name: 'Reason', value: reason },
    ]);

    await message.reply(`Timed out **${target.user.tag}** for **${durationRaw}**`);
    return true;
  }

  if (command === 'clear') {
    if (!canUseTrialMod(message.member)) {
      await message.reply('Only trial moderators or above can do that.');
      return true;
    }

    const amount = parseInt(args[0], 10);

    if (!amount || amount < 1 || amount > 100) {
      await message.reply('Use it like: `.clear 20`');
      return true;
    }

    await message.channel.bulkDelete(amount, true).catch(() => {});

    await message.reply(`Deleted **${amount}** messages.`).then(msg => {
      setTimeout(() => msg.delete().catch(() => {}), 2500);
    });

    return true;
  }

  if (command === 'say') {
    if (!canUseOwner(message.member)) {
      await message.reply('Only the owner can do that.');
      return true;
    }

    const text = args.join(' ');

    if (!text) {
      await message.reply('Use it like: `.say your message here`');
      return true;
    }

    await message.channel.send(text);
    await message.delete().catch(() => {});
    return true;
  }

  if (command === 'addlevel') {
    if (!canUseMod(message.member)) {
      await message.reply('Only moderators or above can do that.');
      return true;
    }

    const rawTarget = args.shift();
    const amount = parseInt(args.shift(), 10);
    const target = parseTarget(message, rawTarget);

    if (!target || !amount || amount < 1) {
      await message.reply('Use it like: `.addlevel @user 5`');
      return true;
    }

    const profile = getProfile(message.guild.id, target.id);
    const newLevel = profile.level + amount;
    const newXp = xpForLevel(newLevel);

    setXp(message.guild.id, target.id, newXp);

    await message.reply(`Added **${amount}** level(s) to ${target}. They are now **Level ${newLevel}**.`);
    return true;
  }

  if (command === 'removelevel') {
    if (!canUseMod(message.member)) {
      await message.reply('Only moderators or above can do that.');
      return true;
    }

    const rawTarget = args.shift();
    const amount = parseInt(args.shift(), 10);
    const target = parseTarget(message, rawTarget);

    if (!target || !amount || amount < 1) {
      await message.reply('Use it like: `.removelevel @user 5`');
      return true;
    }

    const profile = getProfile(message.guild.id, target.id);
    const newLevel = Math.max(0, profile.level - amount);
    const newXp = xpForLevel(newLevel);

    setXp(message.guild.id, target.id, newXp);

    await message.reply(`Removed **${amount}** level(s) from ${target}. They are now **Level ${newLevel}**.`);
    return true;
  }

  return false;
}

module.exports = {
  handlePrefixCommand,
};