const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { isStaff, deny } = require('../../systems/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('listcar')
    .setDescription('Post a car listing.')
    .addStringOption(o => o.setName('car').setDescription('Car name').setRequired(true))
    .addStringOption(o =>
      o.setName('platform')
        .setDescription('Platform')
        .setRequired(true)
        .addChoices(
          { name: 'PlayStation', value: 'PlayStation' },
          { name: 'Xbox', value: 'Xbox' },
          { name: 'PC', value: 'PC' },
        )
    )
    .addStringOption(o => o.setName('mods').setDescription('Mods/features').setRequired(true))
    .addStringOption(o => o.setName('access').setDescription('Free, tip optional, VIP, etc.').setRequired(true))
    .addStringOption(o => o.setName('availability').setDescription('When are you available?').setRequired(true))
    .addAttachmentOption(o => o.setName('image').setDescription('Car picture').setRequired(false)),

  async execute(interaction) {
    const allowed =
      isStaff(interaction.member) ||
      interaction.member.roles.cache.has(config.roles.verifiedHost);

    if (!allowed) {
      return interaction.reply(
        deny('Only staff or Verified Hosts can use `/listcar`.')
      );
    }

    const image = interaction.options.getAttachment('image');

    const embed = new EmbedBuilder()
      .setTitle('🚗 New Car Listing')
      .setColor(config.colors.red)
      .addFields(
        { name: 'Car', value: interaction.options.getString('car'), inline: true },
        { name: 'Platform', value: interaction.options.getString('platform'), inline: true },
        { name: 'Access', value: interaction.options.getString('access'), inline: true },
        { name: 'Mods/Features', value: interaction.options.getString('mods') },
        { name: 'Availability', value: interaction.options.getString('availability') },
        { name: 'Host', value: `${interaction.user}` },
      )
      .setFooter({ text: 'Cruel Violations Customs' })
      .setTimestamp();

    if (image) embed.setImage(image.url);

    const channel = await interaction.guild.channels.fetch(config.channels.carDrop).catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: 'Car drop channel was not found.',
        ephemeral: true,
      });
    }

    await channel.send({ embeds: [embed] });

    await interaction.reply({
      content: 'Car listing posted.',
      ephemeral: true,
    });
  },
};