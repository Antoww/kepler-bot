import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
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
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const channel = interaction.options.getChannel('canal');
    
    if (!channel) {
        await interaction.reply('Canal invalide.');
        return;
    }

    try {
        // Sauvegarder la configuration dans la base de données
        await updateBirthdayChannel(interaction.guild.id, channel.id);

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#FF69B4')
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
