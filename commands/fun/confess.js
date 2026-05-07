const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confess')
    .setDescription('Send an anonymous confession.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Your confession')
        .setRequired(true)
        .setMaxLength(1000)
    ),

  async execute(interaction) {
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle('Anonymous Confession')
      .setColor(config.colors?.darkRed || 0x8b0000)
      .setDescription(message)
      .setFooter({ text: 'Sent anonymously' })
      .setTimestamp();

    await interaction.channel.send({ embeds: [embed] });

    await interaction.reply({
      content: 'Confession sent.',
      ephemeral: true,
    });
  },
};
