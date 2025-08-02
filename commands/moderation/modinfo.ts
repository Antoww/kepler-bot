import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getModerationHistory, getActiveTempBan, getActiveTempMute } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('modinfo')
    .setDescription('Affiche les informations de modération d\'un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur dont afficher les informations')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    
    if (!target) {
        await interaction.reply('Utilisateur invalide.');
        return;
    }

    try {
        // Récupérer l'historique de modération depuis la base de données
        const history = await getModerationHistory(interaction.guild.id, target.id, 10);

        // Vérifier si l'utilisateur a des sanctions actives
        const activeBan = await getActiveTempBan(interaction.guild.id, target.id);
        const activeMute = await getActiveTempMute(interaction.guild.id, target.id);

        // Créer l'embed
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `Informations de modération - ${target.tag}`, 
                iconURL: target.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#0099ff')
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        // Sanctions actives
        let activeStatus = '✅ Aucune sanction active';
        if (activeBan) {
            activeStatus = `🔨 **Ban temporaire actif**\nExpire: <t:${Math.floor(new Date(activeBan.end_time).getTime() / 1000)}:F>\nRaison: ${activeBan.reason}`;
        } else if (activeMute) {
            activeStatus = `🔇 **Mute temporaire actif**\nExpire: <t:${Math.floor(new Date(activeMute.end_time).getTime() / 1000)}:F>\nRaison: ${activeMute.reason}`;
        }

        embed.addFields({ name: '📊 Statut actuel', value: activeStatus, inline: false });

        // Historique récent
        if (history && history.length > 0) {
            const historyText = history.slice(0, 5).map((entry, index) => {
                const date = new Date(entry.created_at);
                const timestamp = Math.floor(date.getTime() / 1000);
                const duration = entry.duration ? ` (${entry.duration})` : '';
                return `**${index + 1}.** ${getActionEmoji(entry.action_type)} ${entry.action_type.toUpperCase()}${duration}\n📝 ${entry.reason}\n🕐 <t:${timestamp}:R>`;
            }).join('\n\n');

            embed.addFields({ name: `📜 Historique récent (${history.length} total)`, value: historyText, inline: false });

            // Statistiques
            const stats = {
                ban: history.filter(h => h.action_type === 'ban').length,
                kick: history.filter(h => h.action_type === 'kick').length,
                mute: history.filter(h => h.action_type === 'mute').length
            };

            const statsText = `🔨 Bans: **${stats.ban}**\n👢 Kicks: **${stats.kick}**\n🔇 Mutes: **${stats.mute}**`;
            embed.addFields({ name: '📈 Statistiques', value: statsText, inline: true });
        } else {
            embed.addFields({ name: '📜 Historique', value: 'Aucune action de modération enregistrée', inline: false });
        }

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur lors de la récupération des informations de modération:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la récupération des informations.');
    }
}

function getActionEmoji(action: string): string {
    switch (action.toLowerCase()) {
        case 'ban':
        case 'tempban':
            return '🔨';
        case 'kick':
            return '👢';
        case 'mute':
        case 'tempmute':
            return '🔇';
        case 'unban':
            return '✅';
        case 'unmute':
            return '🔊';
        default:
            return '⚖️';
    }
}
