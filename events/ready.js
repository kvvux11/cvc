const { Events, ActivityType } = require('discord.js');
const { updateCounters } = require('../systems/counters');
const { runVoiceXpSweep } = require('../systems/levels');

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);

    client.user.setPresence({
      activities: [
        {
          name: 'im watching',
          type: ActivityType.Watching,
        },
      ],
      status: 'dnd',
    });

    await updateCounters(client);
    await runVoiceXpSweep(client);

    setInterval(async () => {
      await updateCounters(client).catch(console.error);
      await runVoiceXpSweep(client).catch(console.error);
    }, 5 * 60 * 1000);
  },
};