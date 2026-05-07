const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');

require('dotenv').config();

const commands = [];

function clearRequireCache(filePath) {
  delete require.cache[require.resolve(filePath)];
}

function loadCommands(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`Commands folder not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      loadCommands(fullPath);
      continue;
    }

    if (!file.name.endsWith('.js')) continue;

    try {
      clearRequireCache(fullPath);
      const command = require(fullPath);

      if (!command.data || !command.execute) {
        console.log(`[SKIPPED] ${file.name} is missing data or execute.`);
        continue;
      }

      commands.push(command.data.toJSON());
      console.log(`[DEPLOYING] ${command.data.name}`);
    } catch (error) {
      console.log(`[FAILED] ${file.name}`);
      console.error(error);
    }
  }
}

loadCommands(path.join(__dirname, 'commands'));

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

async function deploy() {
  try {
    if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
      console.log('Missing TOKEN, CLIENT_ID, or GUILD_ID in .env');
      return;
    }

    console.log(`Started refreshing ${commands.length} guild commands.`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log(`Successfully deployed ${commands.length} commands.`);
  } catch (error) {
    console.error(error);
  }
}

deploy();
