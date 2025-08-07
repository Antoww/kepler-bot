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
import { 
    getModerationHistory, 
    getUserWarnings, 
    removeWarningBySanctionNumber, 
    addModerationHistory 
} from '../../database/db.ts';
import { logModeration } from '../../utils/moderationLogger.ts';

export const data = new SlashCommandBuilder()
    .setName('sanctions')
    .setDescription('Gère les sanctions d\'un utilisateur')
    .addSubcommand(subcommand =>
        subcommand
            .setName('voir')
            .setDescription('Affiche toutes les sanctions d\'un utilisateur')
            .addUserOption(option => option.setName('utilisateur')
                .setDescription('L\'utilisateur dont afficher les sanctions')
                .setRequired(true))
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('supprimer')
            .setDescription('Supprime une sanction par son numéro')
            .addIntegerOption(option => option.setName('numero_sanction')
                .setDescription('Le numéro de la sanction à supprimer')
                .setRequired(true))
            .addStringOption(option => option.setName('raison')
                .setDescription('La raison de la suppression')
                .setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'voir') {
        await handleViewSanctions(interaction);
    } else if (subcommand === 'supprimer') {
        await handleRemoveSanction(interaction);
    }
}

async function handleViewSanctions(interaction: CommandInteraction) {
    const target = interaction.options.getUser('utilisateur');
    
    if (!target) {
        await interaction.reply('Utilisateur invalide.');
        return;
    }

    try {
        // Récupérer toutes les sanctions
        const history = await getModerationHistory(interaction.guild!.id, target.id, 50);
        const warnings = await getUserWarnings(interaction.guild!.id, target.id);

        if (!history || history.length === 0) {
            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Sanctions - ${target.tag}`, 
                    iconURL: target.displayAvatarURL({ forceStatic: false }) 
                })
                .setColor('#0099ff')
                .setDescription('❌ Aucune sanction trouvée pour cet utilisateur.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        let currentPage = 0;
        const itemsPerPage = 5;
        const totalPages = Math.ceil(history.length / itemsPerPage);

        const generateEmbed = (page: number) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentSanctions = history.slice(start, end);

            const embed = new EmbedBuilder()
                .setAuthor({ 
                    name: `Sanctions - ${target.tag}`, 
                    iconURL: target.displayAvatarURL({ forceStatic: false }) 
                })
                .setColor('#0099ff')
                .setFooter({ text: `Page ${page + 1}/${totalPages} • ${history.length} sanctions total` })
                .setTimestamp();

            const sanctionsText = currentSanctions.map(entry => {
                const date = new Date(entry.created_at);
                const timestamp = Math.floor(date.getTime() / 1000);
                const duration = entry.duration ? ` (${entry.duration})` : '';
                const sanctionNum = entry.sanction_number ? `#${entry.sanction_number}` : '';
                const emoji = getActionEmoji(entry.action_type);
                
                return `**${sanctionNum}** ${emoji} **${entry.action_type.toUpperCase()}**${duration}\n📝 ${entry.reason}\n🕐 <t:${timestamp}:F> (<t:${timestamp}:R>)\n🛡️ Modérateur: <@${entry.moderator_id}>`;
            }).join('\n\n');

            embed.setDescription(sanctionsText);

            // Statistiques
            const stats = {
                ban: history.filter(h => h.action_type === 'ban' || h.action_type === 'tempban').length,
                kick: history.filter(h => h.action_type === 'kick').length,
                mute: history.filter(h => h.action_type === 'mute' || h.action_type === 'tempmute').length,
                warn: warnings.length,
                unban: history.filter(h => h.action_type === 'unban').length,
                unmute: history.filter(h => h.action_type === 'unmute').length
            };

            const statsText = [
                `🔨 Bans: **${stats.ban}**`,
                `👢 Kicks: **${stats.kick}**`,
                `🔇 Mutes: **${stats.mute}**`,
                `⚠️ Warns actifs: **${stats.warn}**`,
                `✅ Unbans: **${stats.unban}**`,
                `🔊 Unmutes: **${stats.unmute}**`
            ].join('\n');

            embed.addFields({ name: '📈 Statistiques', value: statsText, inline: true });

            return embed;
        };

        const generateButtons = (page: number) => {
            return new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('first')
                        .setLabel('⏮️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('previous')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('last')
                        .setLabel('⏭️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );
        };

        const embed = generateEmbed(currentPage);
        const components = totalPages > 1 ? [generateButtons(currentPage)] : [];

        const response = await interaction.reply({ 
            embeds: [embed], 
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
                    case 'first':
                        currentPage = 0;
                        break;
                    case 'previous':
                        currentPage = Math.max(0, currentPage - 1);
                        break;
                    case 'next':
                        currentPage = Math.min(totalPages - 1, currentPage + 1);
                        break;
                    case 'last':
                        currentPage = totalPages - 1;
                        break;
                }

                await i.update({ 
                    embeds: [generateEmbed(currentPage)], 
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

    } catch (error) {
        console.error('Erreur lors de la récupération des sanctions:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la récupération des sanctions.');
    }
}

async function handleRemoveSanction(interaction: CommandInteraction) {
    const sanctionNumber = interaction.options.getInteger('numero_sanction');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!sanctionNumber) {
        await interaction.reply('Numéro de sanction invalide.');
        return;
    }

    try {
        // Supprimer le warning (pour l'instant on ne gère que les warnings)
        const removed = await removeWarningBySanctionNumber(interaction.guild!.id, sanctionNumber);

        if (!removed) {
            await interaction.reply(`❌ Aucun avertissement trouvé avec le numéro de sanction #${sanctionNumber}.`);
            return;
        }

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Sanction supprimée')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(
            interaction.guild!, 
            'Unwarn', 
            interaction.user, // On ne peut pas récupérer l'utilisateur original facilement
            interaction.user, 
            reason,
            `Sanction #${sanctionNumber} supprimée`
        );

    } catch (error) {
        console.error('Erreur lors de la suppression de la sanction:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la suppression de la sanction.');
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
