const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const vibes = [
  'silent threat',
  'walking red flag',
  'actually chill',
  'hard to read',
  'chaotic neutral',
  'lowkey dangerous',
  'barely awake',
  'main character for no reason',
  'shadow banned from peace',
  'surprisingly normal',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vibecheck')
    .setDescription('Check someone’s vibe.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const vibe = vibes[Math.floor(Math.random() * vibes.length)];
    const percent = Math.floor(Math.random() * 101);

    const embed = new EmbedBuilder()
      .setTitle('Vibe Check')
      .setColor(config.colors?.darkRed || 0x8b0000)
      .setDescription(`${user} is **${vibe}**.\nVibe strength: **${percent}%**`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
