const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

require('dotenv').config();

const commands = [];

function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    if (!file.name.endsWith('.js')) continue;

    const command = require(fullPath);

    if (!command.data) {
      console.log(`[SKIPPED] ${file.name} missing data.`);
      continue;
    }

    commands.push(command.data.toJSON());
    console.log(`[DEPLOY READY] ${command.data.name}`);
  }
}

loadCommands(path.join(__dirname, 'commands'));

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} slash commands...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );

    console.log('Slash commands deployed.');
  } catch (error) {
    console.error(error);
  }
})();