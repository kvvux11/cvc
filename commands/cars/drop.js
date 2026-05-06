const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { isStaff, deny } = require('../../systems/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('drop')
    .setDescription('Announce a car drop.')
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Drop info')
        .setRequired(true)
    )
    .addBooleanOption(o =>
      o.setName('ping')
        .setDescription('Ping car drop role?')
        .setRequired(false)
    ),

  async execute(interaction) {
    const allowed =
      isStaff(interaction.member) ||
      interaction.member.roles.cache.has(config.roles.verifiedHost);

    if (!allowed) {
      return interaction.reply(
        deny('Only staff or Verified Hosts can use `/drop`.')
      );
    }

    const msg = interaction.options.getString('message');
    const ping = interaction.options.getBoolean('ping') || false;

    const embed = new EmbedBuilder()
      .setTitle('🚨 Car Drop')
      .setColor(config.colors.red)
      .setDescription(msg)
      .addFields({ name: 'Posted By', value: `${interaction.user}` })
      .setFooter({ text: 'Cruel Violations Customs' })
      .setTimestamp();

    const channel = await interaction.guild.channels
      .fetch(config.channels.carDrop)
      .catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: 'Car drop channel was not found.',
        ephemeral: true,
      });
    }

    await channel.send({
      content: ping ? `<@&${config.roles.carDropPing}>` : null,
      embeds: [embed],
    });

    await interaction.reply({
      content: 'Drop posted.',
      ephemeral: true,
    });
  },
};