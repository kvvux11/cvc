const {
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

const Database = require('better-sqlite3');
const config = require('../config');

const db = new Database('./database.sqlite');

db.prepare(`
  CREATE TABLE IF NOT EXISTS temp_voice (
    guild_id TEXT NOT NULL,
    channel_id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`).run();

function saveTempChannel(guildId, channelId, ownerId) {
  db.prepare(`
    INSERT OR REPLACE INTO temp_voice (guild_id, channel_id, owner_id, created_at)
    VALUES (?, ?, ?, ?)
  `).run(guildId, channelId, ownerId, Date.now());
}

function deleteTempChannel(channelId) {
  db.prepare('DELETE FROM temp_voice WHERE channel_id = ?').run(channelId);
}

function getTempByChannel(channelId) {
  return db.prepare('SELECT * FROM temp_voice WHERE channel_id = ?').get(channelId);
}

function getTempByOwner(guildId, ownerId) {
  return db.prepare(`
    SELECT * FROM temp_voice
    WHERE guild_id = ? AND owner_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(guildId, ownerId);
}

async function getOwnedChannel(interaction) {
  const guild = interaction.guild;
  const member = interaction.member;

  if (!guild || !member) return null;

  const currentVoice = member.voice?.channel;

  if (currentVoice) {
    const currentRow = getTempByChannel(currentVoice.id);
    if (currentRow && currentRow.owner_id === member.id) return currentVoice;
  }

  const row = getTempByOwner(guild.id, member.id);
  if (!row) return null;

  const channel = await guild.channels.fetch(row.channel_id).catch(() => null);

  if (!channel) {
    deleteTempChannel(row.channel_id);
    return null;
  }

  return channel;
}

async function handleTempVoice(oldState, newState) {
  if (!newState.guild) return;

  const joinedCreateChannel =
    newState.channelId === config.channels.clickToCreateVoice &&
    oldState.channelId !== newState.channelId;

  if (joinedCreateChannel) {
    const parent = newState.channel?.parentId || null;

    const channel = await newState.guild.channels.create({
      name: `${newState.member.user.username}'s vc`.slice(0, 90),
      type: ChannelType.GuildVoice,
      parent,
      permissionOverwrites: [
        {
          id: newState.guild.roles.everyone.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
          ],
        },
        {
          id: newState.member.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.MuteMembers,
            PermissionFlagsBits.DeafenMembers,
          ],
        },
      ],
    });

    saveTempChannel(newState.guild.id, channel.id, newState.member.id);

    await newState.member.voice.setChannel(channel).catch(() => {});
  }

  if (oldState.channelId) {
    const row = getTempByChannel(oldState.channelId);

    if (row) {
      const oldChannel = oldState.channel;

      if (oldChannel && oldChannel.members.size === 0) {
        deleteTempChannel(oldState.channelId);
        await oldChannel.delete('Temporary voice channel empty.').catch(() => {});
      }
    }
  }
}

async function handleVoiceButton(interaction) {
  if (!interaction.isButton()) return false;
  if (!interaction.customId.startsWith('voice_')) return false;

  const channel = await getOwnedChannel(interaction);

  if (!channel) {
    await interaction.reply({
      content: 'You do not own a temporary voice channel right now.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_private') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      ViewChannel: false,
      Connect: false,
    });

    await channel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
    });

    await interaction.reply({
      content: 'Your voice channel is now private.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_public') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
    });

    await interaction.reply({
      content: 'Your voice channel is now public.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_lock') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      Connect: false,
    });

    await interaction.reply({
      content: 'Your voice channel is now locked.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_unlock') {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
      Connect: true,
    });

    await interaction.reply({
      content: 'Your voice channel is now unlocked.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_rename') {
    const modal = new ModalBuilder()
      .setCustomId('voice_rename_modal')
      .setTitle('Rename Voice Channel');

    const input = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('New channel name')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
    return true;
  }

  if (interaction.customId === 'voice_permit') {
    const modal = new ModalBuilder()
      .setCustomId('voice_permit_modal')
      .setTitle('Permit Member');

    const input = new TextInputBuilder()
      .setCustomId('user_id')
      .setLabel('User ID or mention')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(80);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
    return true;
  }

  return false;
}

async function handleVoiceModal(interaction) {
  if (!interaction.isModalSubmit()) return false;
  if (!interaction.customId.startsWith('voice_')) return false;

  const channel = await getOwnedChannel(interaction);

  if (!channel) {
    await interaction.reply({
      content: 'You do not own a temporary voice channel right now.',
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_rename_modal') {
    const name = interaction.fields.getTextInputValue('name').trim();

    await channel.setName(name.slice(0, 90)).catch(() => {});

    await interaction.reply({
      content: `Renamed your voice channel to **${name}**.`,
      ephemeral: true,
    });
    return true;
  }

  if (interaction.customId === 'voice_permit_modal') {
    const raw = interaction.fields.getTextInputValue('user_id').trim();
    const id = raw.replace(/[<@!>]/g, '');

    if (!/^\d+$/.test(id)) {
      await interaction.reply({
        content: 'That does not look like a valid user ID or mention.',
        ephemeral: true,
      });
      return true;
    }

    await channel.permissionOverwrites.edit(id, {
      ViewChannel: true,
      Connect: true,
      Speak: true,
    }).catch(async () => {
      await interaction.reply({
        content: 'I could not permit that user.',
        ephemeral: true,
      });
    });

    if (!interaction.replied) {
      await interaction.reply({
        content: `<@${id}> can now access your voice channel.`,
        ephemeral: true,
      });
    }

    return true;
  }

  return false;
}

module.exports = {
  handleTempVoice,
  handleVoiceButton,
  handleVoiceModal,
};
