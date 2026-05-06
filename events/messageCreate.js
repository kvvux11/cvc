const { Events } = require('discord.js');
const config = require('../config');
const { addMessageXp } = require('../systems/levels');
const { handlePrefixCommand } = require('../systems/prefixCommands');
const { handleApplicationDM } = require('../systems/tickets');

module.exports = {
  name: Events.MessageCreate,

  async execute(message, client) {
    if (message.author.bot) return;

    if (!message.guild) {
      await handleApplicationDM(message, client);
      return;
    }

    if (message.mentions.users.has(config.ownerId) && message.author.id !== config.ownerId) {
      await message.reply({
        content:
          `Please don’t ping **xxcessive** directly.\nIf you need help, ping a staff member that can answer you or open a ticket and someone will get to you.`,
        allowedMentions: { repliedUser: false },
      }).catch(() => {});
    }

    const usedPrefix = await handlePrefixCommand(message, client);
    if (usedPrefix) return;

    await addMessageXp(message);
  },
};