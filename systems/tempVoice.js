const {
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const config = require('../config');

const tempChannels = new Map();

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

    tempChannels.set(channel.id, newState.member.id);

    await newState.member.voice.setChannel(channel).catch(() => {});
  }

  if (oldState.channelId && tempChannels.has(oldState.channelId)) {
    const oldChannel = oldState.channel;

    if (oldChannel && oldChannel.members.size === 0) {
      tempChannels.delete(oldState.channelId);
      await oldChannel.delete('Temporary voice channel empty.').catch(() => {});
    }
  }
}

module.exports = {
  handleTempVoice,
};