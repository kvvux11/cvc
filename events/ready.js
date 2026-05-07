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

    setInterval(async () => {
      await updateCounters(client).catch(console.error);
      await runVoiceXpSweep(client).catch(console.error);
    }, 5 * 60 * 1000);

    startMediaPoster(client);

    await postServerUpdate(client, [
      'server moved into the /ritual style',
      'levels now post in the new levels channel',
      'tickets/applications are being cleaned up for the community style',
      'auto media posting has been added for pfps, banners, cars, and animals',
      'trial staff permissions are still limited',
      'new prefix/community commands are active',
    ]).catch(console.error);
  },
};
