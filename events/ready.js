const { Events, ActivityType } = require('discord.js');
const { updateCounters } = require('../systems/counters');
const { runVoiceXpSweep } = require('../systems/levels');
const { startMediaPoster } = require('../systems/mediaPoster');
const { postServerUpdate } = require('../systems/serverUpdates');
const { enforceRitualChannelPermissions } = require('../systems/ritualChannel');

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
    await enforceRitualChannelPermissions(client).catch(console.error);

    startMediaPoster(client);

    await postServerUpdate(client).catch(console.error);

    setInterval(async () => {
      await updateCounters(client).catch(console.error);
      await runVoiceXpSweep(client).catch(console.error);
    }, 5 * 60 * 1000);
  },
};