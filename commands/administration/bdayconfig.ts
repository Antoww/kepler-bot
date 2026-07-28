import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { updateBirthdayChannel } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('bdayconfig')
    .setDescription('Configure le canal d\'anniversaires du serveur')
    .addChannelOption(option => option.setName('canal')
        .setDescription('Le canal où annoncer les anniversaires')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const channel = interaction.options.getChannel('canal');

    if (!channel) {
        await interaction.reply(KEPLER_MESSAGES.invalidChannel);
        return;
    }

    try {
        // Sauvegarder la configuration dans la base de données
        await updateBirthdayChannel(interaction.guild.id, channel.id);

        const embed = createKeplerEmbed()
            .setAuthor({
                name: interaction.client.user?.username,
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setColor(KEPLER_COLORS.highlight)
            .setTitle('🎂 Configuration des anniversaires mise à jour')
            .setDescription(`Les anniversaires seront maintenant annoncés dans ${channel}`)
            .addFields(
                { name: '📋 Information', value: 'Les membres peuvent maintenant définir leur anniversaire avec `/birthday set`', inline: false }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la configuration du canal d\'anniversaires:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la configuration du canal d\'anniversaires.');
    }
}
