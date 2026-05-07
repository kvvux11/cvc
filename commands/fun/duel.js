const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const outcomes = [
  'landed a clean hit',
  'got folded instantly',
  'dodged everything somehow',
  'won by doing absolutely nothing',
  'missed every shot and still won',
  'got humbled',
  'walked out untouched',
  'got caught lacking',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Duel another member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Who are you dueling?')
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('user');

    if (target.bot) {
      return interaction.reply({
        content: 'Don’t duel bots. They don’t feel pain.',
        ephemeral: true,
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        content: 'You challenged yourself and still almost lost.',
      });
    }

    const winner = Math.random() < 0.5 ? interaction.user : target;
    const loser = winner.id === interaction.user.id ? target : interaction.user;
    const result = outcomes[Math.floor(Math.random() * outcomes.length)];

    const embed = new EmbedBuilder()
      .setTitle('Duel')
      .setColor(config.colors?.red || 0xff0000)
      .setDescription(`${winner} beat ${loser} and **${result}**.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
