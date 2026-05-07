const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandpanel')
    .setDescription('Post the temporary voice channel command panel. Owner only.'),

  async execute(interaction) {
    if (interaction.user.id !== config.ownerId) {
      return interaction.reply({
        content: 'Only the owner can use this command.',
        ephemeral: true,
      });
    }

    const channel = await interaction.guild.channels
      .fetch(config.channels.channelCommands)
      .catch(() => null);

    if (!channel) {
      return interaction.reply({
        content: 'Channel commands channel was not found in config.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Voice Channel Commands')
      .setColor(config.colors?.darkRed || 0x8b0000)
      .setDescription([
        'Use these buttons to control your temporary voice channel.',
        '',
        'You must own a temp VC created from **Click To Create**.',
        '',
        '**Private** hides your VC from everyone except you.',
        '**Public** opens it again.',
        '**Lock** stops new people joining.',
        '**Unlock** lets people join again.',
        '**Rename** changes the channel name.',
        '**Permit** lets a specific member access it.',
      ].join('\n'))
      .setFooter({ text: config.botName || 'skid' })
      .setTimestamp();

    const rowOne = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('voice_private').setLabel('Private').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_public').setLabel('Public').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('voice_lock').setLabel('Lock').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('voice_unlock').setLabel('Unlock').setStyle(ButtonStyle.Success)
    );

    const rowTwo = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('voice_rename').setLabel('Rename').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('voice_permit').setLabel('Permit User').setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      embeds: [embed],
      components: [rowOne, rowTwo],
    });

    await interaction.reply({
      content: 'Command panel posted.',
      ephemeral: true,
    });
  },
};
