import { 
    type CommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import { getModerationHistory, getActiveTempBan, getActiveTempMute, getUserWarnings } from '../../database/db.ts';

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

        // Récupérer les warnings actifs
        const warnings = await getUserWarnings(interaction.guild.id, target.id);

        // Vérifier si l'utilisateur a des sanctions actives
        const activeBan = await getActiveTempBan(interaction.guild.id, target.id);
        const activeMute = await getActiveTempMute(interaction.guild.id, target.id);

        // Créer l'embed
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(`📋 Informations de modération - ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .addFields(
                { name: '🆔 ID Utilisateur', value: target.id, inline: true },
                { name: '📅 Compte créé', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🔗 Mention', value: `<@${target.id}>`, inline: true }
            )
            .setTimestamp();

        // Vérifier si l'utilisateur est encore sur le serveur
        const member = interaction.guild.members.cache.get(target.id);
        if (member) {
            embed.addFields(
                { name: '📥 A rejoint le serveur', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: true },
                { name: '🎭 Rôle le plus élevé', value: member.roles.highest.toString(), inline: true },
                { name: '📊 Statut sur le serveur', value: '✅ Membre actuel', inline: true }
            );
        } else {
            embed.addFields({ name: '📊 Statut sur le serveur', value: '❌ N\'est plus membre', inline: true });
        }

        // Sanctions actives
        let activeStatus = '✅ Aucune sanction active';
        if (activeBan) {
            activeStatus = `🔨 **Ban temporaire actif**\nExpire: <t:${Math.floor(new Date(activeBan.end_time).getTime() / 1000)}:F>\nRaison: ${activeBan.reason}`;
        } else if (activeMute) {
            activeStatus = `🔇 **Mute temporaire actif**\nExpire: <t:${Math.floor(new Date(activeMute.end_time).getTime() / 1000)}:F>\nRaison: ${activeMute.reason}`;
        }

        embed.addFields({ name: '📊 Statut actuel', value: activeStatus, inline: false });

        // Warnings actifs
        if (warnings && warnings.length > 0) {
            const warningsText = warnings.slice(0, 3).map((warning, index) => {
                const date = new Date(warning.created_at);
                const timestamp = Math.floor(date.getTime() / 1000);
                return `**#${warning.sanction_number}** - ${warning.reason}\n🕐 <t:${timestamp}:R>`;
            }).join('\n\n');

            embed.addFields({ 
                name: `⚠️ Avertissements actifs (${warnings.length})`, 
                value: warningsText.length > 1024 ? warningsText.substring(0, 1021) + '...' : warningsText, 
                inline: false 
            });
        }

        // Historique récent avec pagination
        if (history && history.length > 0) {
            let currentPage = 0;
            const itemsPerPage = 5;
            const totalPages = Math.ceil(history.length / itemsPerPage);

            const generateHistoryEmbed = (baseEmbed: EmbedBuilder, page: number) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const currentHistory = history.slice(start, end);

                const historyText = currentHistory.map((entry, index) => {
                    const date = new Date(entry.created_at);
                    const timestamp = Math.floor(date.getTime() / 1000);
                    const duration = entry.duration ? ` (${entry.duration})` : '';
                    const sanctionNum = entry.sanction_number ? `#${entry.sanction_number}` : '';
                    return `**${sanctionNum}** ${getActionEmoji(entry.action_type)} ${entry.action_type.toUpperCase()}${duration}\n📝 ${entry.reason}\n🕐 <t:${timestamp}:R>`;
                }).join('\n\n');

                const newEmbed = EmbedBuilder.from(baseEmbed.toJSON());
                newEmbed.addFields({ 
                    name: `📜 Historique (Page ${page + 1}/${totalPages}) - ${history.length} total`, 
                    value: historyText, 
                    inline: false 
                });

                return newEmbed;
            };

            const generateButtons = (page: number) => {
                return new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('previous_history')
                            .setLabel('⬅️ Précédent')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next_history')
                            .setLabel('➡️ Suivant')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === totalPages - 1)
                    );
            };

            // Statistiques
            const stats = {
                ban: history.filter(h => h.action_type === 'ban' || h.action_type === 'tempban').length,
                kick: history.filter(h => h.action_type === 'kick').length,
                mute: history.filter(h => h.action_type === 'mute').length,
                warn: history.filter(h => h.action_type === 'warn').length
            };

            const statsText = `🔨 Bans: **${stats.ban}**\n👢 Kicks: **${stats.kick}**\n🔇 Mutes: **${stats.mute}**\n⚠️ Warns: **${stats.warn}**`;
            embed.addFields({ name: '📈 Statistiques', value: statsText, inline: true });

            const finalEmbed = generateHistoryEmbed(embed, currentPage);
            const components = totalPages > 1 ? [generateButtons(currentPage)] : [];

            const response = await interaction.reply({ 
                embeds: [finalEmbed], 
                components,
                fetchReply: true 
            });

            if (totalPages > 1) {
                const collector = response.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 300000 // 5 minutes
                });

                collector.on('collect', async i => {
                    if (i.user.id !== interaction.user.id) {
                        await i.reply({ content: 'Vous ne pouvez pas utiliser ces boutons.', ephemeral: true });
                        return;
                    }

                    switch (i.customId) {
                        case 'previous_history':
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case 'next_history':
                            currentPage = Math.min(totalPages - 1, currentPage + 1);
                            break;
                    }

                    const updatedEmbed = generateHistoryEmbed(embed, currentPage);
                    await i.update({ 
                        embeds: [updatedEmbed], 
                        components: [generateButtons(currentPage)] 
                    });
                });

                collector.on('end', async () => {
                    try {
                        await interaction.editReply({ components: [] });
                    } catch (error) {
                        // Message peut être supprimé
                    }
                });
            }
        } else {
            embed.addFields({ name: '📜 Historique', value: 'Aucune action de modération enregistrée', inline: false });
            await interaction.reply({ embeds: [embed] });
        }

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
        case 'warn':
            return '⚠️';
        case 'unban':
            return '✅';
        case 'unmute':
            return '🔊';
        default:
            return '⚖️';
    }
}
