const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Vouch for a host.')
    .addUserOption(o => o.setName('host').setDescription('Host').setRequired(true))
    .addStringOption(o => o.setName('car').setDescription('Car').setRequired(true))
    .addStringOption(o => o.setName('message').setDescription('Vouch message').setRequired(true)),

  async execute(interaction) {
    const host = interaction.options.getUser('host');

    const embed = new EmbedBuilder()
      .setTitle('New Vouch')
      .setColor(config.colors.green)
      .addFields(
        { name: 'Host', value: `${host}`, inline: true },
        { name: 'Car', value: interaction.options.getString('car'), inline: true },
        { name: 'Vouch', value: interaction.options.getString('message') },
        { name: 'From', value: `${interaction.user}` },
      )
      .setTimestamp();

    const channel = await interaction.guild.channels.fetch(config.channels.vouches);
    await channel.send({ embeds: [embed] });

    await interaction.reply({ content: 'Vouch posted.', ephemeral: true });
  },
};