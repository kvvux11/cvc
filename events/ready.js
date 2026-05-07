const { Events, ActivityType } = require('discord.js');
const { updateCounters } = require('../systems/counters');
const { runVoiceXpSweep } = require('../systems/levels');
const { startMediaPoster } = require('../systems/mediaPoster');
const { postServerUpdate } = require('../systems/serverUpdates');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
      activities: [
        {
          name: '/ritual',
          type: ActivityType.Watching,
        },
      ],
      status: 'dnd',
    });

    await updateCounters(client).catch(console.error);
    await runVoiceXpSweep(client).catch(console.error);

    startMediaPoster(client);

    await postServerUpdate(client, [
      'skid is online.',
      'Updated /ritual systems.',
      'Media posting is active.',
      'Temporary voice channels are active.',
      'Levels, tickets, logs, and commands are loaded.',
    ]).catch(console.error);

    setInterval(async () => {
      await updateCounters(client).catch(console.error);
      await runVoiceXpSweep(client).catch(console.error);
    }, 5 * 60 * 1000);
  },
};