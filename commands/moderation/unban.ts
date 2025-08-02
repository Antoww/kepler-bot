import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Débannir un utilisateur')
    .addStringOption(option => option.setName('user_id')
        .setDescription('L\'ID de l\'utilisateur à débannir')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison du débannissement')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const userId = interaction.options.getString('user_id');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!userId) {
        await interaction.reply('ID utilisateur invalide.');
        return;
    }

    try {
        // Vérifier si l'utilisateur est banni
        const bans = await interaction.guild.bans.fetch();
        const bannedUser = bans.get(userId);

        if (!bannedUser) {
            await interaction.reply('❌ Cet utilisateur n\'est pas banni.');
            return;
        }

        // Débannir l'utilisateur
        await interaction.guild.members.unban(userId, `${reason} - Par ${interaction.user.tag}`);

        // Ajouter à l'historique de modération
        await addModerationHistory(interaction.guild.id, userId, interaction.user.id, 'unban', reason);

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Utilisateur débanni')
            .addFields(
                { name: '👤 Utilisateur', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setThumbnail(bannedUser.user.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Unban', bannedUser.user, interaction.user, reason);

    } catch (error) {
        console.error('Erreur lors du débannissement:', error);
        await interaction.reply('❌ Une erreur est survenue lors du débannissement.');
    }
}
