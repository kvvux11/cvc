const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
} = require('discord.js');

require('dotenv').config();

const { handleTicketButton, handleTicketModal } = require('./systems/tickets');
const { handleVoiceButton, handleVoiceModal } = require('./systems/tempVoice');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember,
  ],
});

client.commands = new Collection();

function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    if (!file.name.endsWith('.js')) continue;

    try {
      const command = require(fullPath);

      if (!command.data || !command.execute) {
        console.log(`[SKIPPED COMMAND] ${file.name} is missing data or execute.`);
        continue;
      }

      client.commands.set(command.data.name, command);
      console.log(`[COMMAND LOADED] ${command.data.name}`);
    } catch (error) {
      console.log(`[FAILED COMMAND] ${file.name}`);
      console.error(error);
    }
  }
}

function loadEvents(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'));

  for (const file of files) {
    const fullPath = path.join(dir, file);

    try {
      const event = require(fullPath);

      if (!event.name || !event.execute) {
        console.log(`[SKIPPED EVENT] ${file} is missing name or execute.`);
        continue;
      }

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }

      console.log(`[EVENT LOADED] ${event.name}`);
    } catch (error) {
      console.log(`[FAILED EVENT] ${file}`);
      console.error(error);
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));
loadEvents(path.join(__dirname, 'events'));

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isButton()) {
      const handledVoice = await handleVoiceButton(interaction);
      if (handledVoice) return;

      return await handleTicketButton(interaction, client);
    }

    if (interaction.isModalSubmit()) {
      const handledVoiceModal = await handleVoiceModal(interaction);
      if (handledVoiceModal) return;

      return await handleTicketModal(interaction, client);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
      return interaction.reply({
        content: 'That command was not found.',
        ephemeral: true,
      }).catch(() => {});
    }

    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);

    const reply = {
      content: 'Something went wrong while running that.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error);
});

client.login(process.env.TOKEN);
