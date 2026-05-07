const { Events } = require('discord.js');
const { handleTempVoice } = require('../systems/tempVoice');

module.exports = {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {
    await handleTempVoice(oldState, newState, client);
  },
};
