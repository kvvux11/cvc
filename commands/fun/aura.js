const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aura')
    .setDescription('Check someone’s aura.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const score = Math.floor(Math.random() * 201) - 50;

    let rating = 'dead signal';
    if (score >= 150) rating = 'untouchable';
    else if (score >= 100) rating = 'heavy presence';
    else if (score >= 50) rating = 'clean aura';
    else if (score >= 0) rating = 'average';
    else rating = 'cursed';

    const embed = new EmbedBuilder()
      .setTitle('Aura Check')
      .setColor(config.colors?.red || 0xff0000)
      .setDescription(`${user} has **${score} aura**.\nStatus: **${rating}**`)
      .setFooter({ text: config.botName || 'skid' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
