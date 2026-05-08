const { Events } = require('discord.js');
const config = require('../config');

const { addMessageXp } = require('../systems/levels');
const { handleApplicationDM } = require('../systems/tickets');
const { handlePrefixCommand } = require('../systems/prefixCommands');

async function safeChannelSend(message, content) {
  if (!message?.channel?.send) return;

  await message.channel.send(content).catch(error => {
    console.log(`[MESSAGE CREATE] Could not send fallback message: ${error.message}`);
  });
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message, client) {
    try {
      if (!message || message.author?.bot) return;

      if (message.partial) {
        await message.fetch().catch(() => null);
      }

      if (!message.guild) {
        if (typeof handleApplicationDM === 'function') {
          await handleApplicationDM(message, client).catch(error => {
            console.log(`[DM APPLICATION] ${error.message}`);
          });
        }

        return;
      }

      if (message.content?.includes(`<@${config.ownerId}>`) || message.content?.includes(`<@!${config.ownerId}>`)) {
        if (message.author.id !== config.ownerId) {
          await message.channel.send({
            content: `${message.author}, don’t ping the owner for normal questions. Ask staff or open a ticket if you need help.`,
            allowedMentions: {
              users: [message.author.id],
              repliedUser: false,
            },
          }).catch(() => {});
        }
      }

      await addMessageXp(message).catch(error => {
        console.log(`[LEVELS] ${error.message}`);
      });

      if (message.content?.startsWith(config.prefix)) {
        try {
          await handlePrefixCommand(message, client);
        } catch (error) {
          // This catches the "Unknown message" crash when a clear command deletes the command message
          // before the bot tries to reply to it.
          if (
            error?.code === 50035 ||
            error?.code === 10008 ||
            String(error?.message || '').includes('Unknown message') ||
            String(error?.message || '').includes('MESSAGE_REFERENCE_UNKNOWN_MESSAGE')
          ) {
            await safeChannelSend(message, 'command ran, but the original message was already gone.');
            return;
          }

          console.error('[PREFIX COMMAND ERROR]', error);
          await safeChannelSend(message, 'something went wrong running that.');
        }
      }
    } catch (error) {
      console.error('[MESSAGE CREATE ERROR]', error);
    }
  },
};
