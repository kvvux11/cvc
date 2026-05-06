const { SlashCommandBuilder } = require('discord.js');

const answers = [
  'Yes.',
  'No.',
  'Probably.',
  'Not happening.',
  'Ask again later.',
  'Definitely.',
  'I would not trust that.',
  'Looks clean to me.',
  'That’s a violation.',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the CVC 8ball.')
    .addStringOption(option =>
      option.setName('question')
        .setDescription('Your question')
        .setRequired(true),
    ),

  async execute(interaction) {
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await interaction.reply(`🎱 ${answer}`);
  },
};