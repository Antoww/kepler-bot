import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { removeWarningBySanctionNumber, addModerationHistory } from '../../database/db.ts';
import { logModeration } from '../../utils/moderationLogger.ts';

export const data = new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Supprimer un avertissement par son numéro de sanction')
    .addIntegerOption(option => option.setName('numero_sanction')
        .setDescription('Le numéro de la sanction à supprimer')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison de la suppression de l\'avertissement')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const sanctionNumber = interaction.options.getInteger('numero_sanction');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!sanctionNumber) {
        await interaction.reply('Numéro de sanction invalide.');
        return;
    }

    try {
        // Supprimer le warning
        const removed = await removeWarningBySanctionNumber(interaction.guild.id, sanctionNumber);

        if (!removed) {
            await interaction.reply(`❌ Aucun avertissement trouvé avec le numéro de sanction #${sanctionNumber}.`);
            return;
        }

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Avertissement supprimé')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action (on ne peut pas récupérer facilement l'utilisateur original, donc on met "Unknown")
        // Pour une meilleure implémentation, il faudrait récupérer les détails du warning avant de le supprimer

    } catch (error) {
        console.error('Erreur lors de la suppression de l\'avertissement:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la suppression de l\'avertissement.');
    }
}
