import { createKeplerEmbed, KEPLER_COLORS } from '../utils/theme.ts';
import { Client, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, Message } from 'discord.js';
import { getExpiredGiveaways, endGiveaway, getGiveawayParticipants, deleteGiveaway, getGiveaway } from '../database/db.ts';
import { logger } from '../utils/logger.ts';

// Map pour stocker les timers actifs
const activeGiveawayTimers = new Map<string, NodeJS.Timeout>();

/**
 * Initialiser les giveaways existants au démarrage du bot
 */
export async function initializeGiveaways(client: Client): Promise<void> {
    try {
        // Récupérer les giveaways expirés
        const expiredGiveaways = await getExpiredGiveaways();

        for (const giveaway of expiredGiveaways) {
            try {
                await finishGiveaway(client, giveaway.id);
            } catch (error) {
                logger.error(`Erreur finalisation giveaway ${giveaway.id}`, error, 'Giveaway');
            }
        }

        if (expiredGiveaways.length > 0) {
            logger.info(`${expiredGiveaways.length} giveaway(s) finalisé(s)`, undefined, 'Giveaway');
        }
    } catch (error) {
        logger.error('Erreur initialisation giveaways', error, 'Giveaway');
    }
}

/**
 * Créer un timer pour un giveaway
 */
export function scheduleGiveaway(client: Client, giveawayId: string, endTime: Date): void {
    // Annuler le timer existant si présent
    if (activeGiveawayTimers.has(giveawayId)) {
        clearTimeout(activeGiveawayTimers.get(giveawayId)!);
    }

    const now = Date.now();
    const delay = endTime.getTime() - now;

    // Si le délai est positif, créer le timer
    if (delay > 0) {
        const timeout = setTimeout(async () => {
            try {
                await finishGiveaway(client, giveawayId);
            } catch (error) {
                console.error(`Erreur lors de la finalisation du giveaway ${giveawayId}:`, error);
            } finally {
                activeGiveawayTimers.delete(giveawayId);
            }
        }, delay);

        activeGiveawayTimers.set(giveawayId, timeout);
        console.log(`⏰ Timer créé pour le giveaway ${giveawayId} (dans ${Math.round(delay / 1000)} secondes)`);
    } else {
        // Le giveaway est déjà expiré, le finir immédiatement
        finishGiveaway(client, giveawayId).catch(error => {
            console.error(`Erreur lors de la finalisation du giveaway ${giveawayId}:`, error);
        });
    }
}

/**
 * Terminer un giveaway et sélectionner les gagnants
 */
export async function finishGiveaway(client: Client, giveawayId: string): Promise<void> {
    try {
        // Récupérer les informations du giveaway
        const giveaway = await getGiveaway(giveawayId);
        if (!giveaway) {
            console.warn(`Giveaway ${giveawayId} non trouvé`);
            return;
        }

        // Si déjà terminé, ne pas refaire
        if (giveaway.ended) {
            return;
        }

        // Récupérer tous les participants
        const participants = await getGiveawayParticipants(giveawayId);

        // Marquer le giveaway comme terminé
        await endGiveaway(giveawayId);

        try {
            // Récupérer le canal et le message
            const channel = await client.channels.fetch(giveaway.channel_id) as TextChannel;
            if (!channel) {
                console.warn(`Canal ${giveaway.channel_id} non trouvé`);
                return;
            }

            const message = await channel.messages.fetch(giveaway.message_id);
            if (!message) {
                console.warn(`Message ${giveaway.message_id} non trouvé`);
                return;
            }

            // Déterminer les gagnants
            const winners: string[] = [];
            const participantIds = participants.map(p => p.user_id);

            if (participantIds.length > 0) {
                const winnerCount = Math.min(giveaway.quantity, participantIds.length);
                const shuffled = participantIds.sort(() => 0.5 - Math.random());
                winners.push(...shuffled.slice(0, winnerCount));
            }

            // Créer l'embed de fin
            const endEmbed = createKeplerEmbed()
                .setColor(KEPLER_COLORS.warning)
                .setTitle(`🎁 ${giveaway.title} - TERMINÉ`)
                .addFields(
                    { name: '🏆 Gagnant(s)', value: winners.length > 0 ? winners.map(id => `<@${id}>`).join('\n') : 'Aucun gagnant', inline: false },
                    { name: '📊 Total de participants', value: `${participantIds.length}`, inline: true },
                    { name: '🎯 Quantité', value: `${giveaway.quantity}`, inline: true }
                );

            if (giveaway.role_id) {
                endEmbed.addFields(
                    { name: '👥 Rôle requis', value: `<@&${giveaway.role_id}>`, inline: true }
                );
            }

            endEmbed.setFooter({ text: `ID: ${giveawayId}` });

            // Mettre à jour le message original
            await message.edit({
                embeds: [endEmbed],
                components: [] // Supprimer les boutons
            });

            // Envoyer un message de confirmation
            const confirmEmbed = createKeplerEmbed()
                .setColor(KEPLER_COLORS.success)
                .setTitle('🎉 Giveaway Terminé!')
                .setDescription(`Le giveaway **${giveaway.title}** s'est terminé.`)
                .addFields(
                    { name: 'Gagnant(s)', value: winners.length > 0 ? winners.map(id => `<@${id}>`).join('\n') : 'Aucun gagnant' }
                );

            await channel.send({ embeds: [confirmEmbed] });

            console.log(`✅ Giveaway ${giveawayId} finalisé avec ${winners.length} gagnant(s)`);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour du message du giveaway ${giveawayId}:`, error);
        }
    } catch (error) {
        console.error(`Erreur lors de la finalisation du giveaway ${giveawayId}:`, error);
    }
}

/**
 * Annuler un giveaway
 */
export async function cancelGiveaway(client: Client, giveawayId: string): Promise<void> {
    try {
        // Récupérer les informations du giveaway
        const giveaway = await getGiveaway(giveawayId);
        if (!giveaway) {
            throw new Error('Giveaway non trouvé');
        }

        // Annuler le timer
        if (activeGiveawayTimers.has(giveawayId)) {
            clearTimeout(activeGiveawayTimers.get(giveawayId)!);
            activeGiveawayTimers.delete(giveawayId);
        }

        // Marquer comme terminé
        await endGiveaway(giveawayId);

        try {
            // Récupérer le canal et le message
            const channel = await client.channels.fetch(giveaway.channel_id) as TextChannel;
            if (!channel) {
                console.warn(`Canal ${giveaway.channel_id} non trouvé`);
                return;
            }

            const message = await channel.messages.fetch(giveaway.message_id);
            if (!message) {
                console.warn(`Message ${giveaway.message_id} non trouvé`);
                return;
            }

            // Créer l'embed d'annulation
            const cancelEmbed = createKeplerEmbed()
                .setColor(KEPLER_COLORS.danger)
                .setTitle(`🎁 ${giveaway.title} - ANNULÉ`)
                .setDescription('Ce giveaway a été annulé par un administrateur.')
                .setFooter({ text: `ID: ${giveawayId}` });

            // Mettre à jour le message
            await message.edit({
                embeds: [cancelEmbed],
                components: [] // Supprimer les boutons
            });

            console.log(`✅ Giveaway ${giveawayId} annulé`);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour du message du giveaway ${giveawayId}:`, error);
        }
    } catch (error) {
        console.error(`Erreur lors de l'annulation du giveaway ${giveawayId}:`, error);
        throw error;
    }
}

/**
 * Terminer immédiatement un giveaway
 */
export async function endGiveawayNow(client: Client, giveawayId: string): Promise<void> {
    try {
        // Annuler le timer
        if (activeGiveawayTimers.has(giveawayId)) {
            clearTimeout(activeGiveawayTimers.get(giveawayId)!);
            activeGiveawayTimers.delete(giveawayId);
        }

        // Finir le giveaway immédiatement
        await finishGiveaway(client, giveawayId);
        console.log(`✅ Giveaway ${giveawayId} terminé immédiatement`);
    } catch (error) {
        console.error(`Erreur lors de la terminaison du giveaway ${giveawayId}:`, error);
        throw error;
    }
}

/**
 * Générer l'embed du giveaway
 */
export function generateGiveawayEmbed(giveaway: any, participantCount: number, timeRemaining: string): EmbedBuilder {
    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.warning)
        .setTitle(`🎁 ${giveaway.title}`)
        .addFields(
            { name: '🏆 Récompense', value: giveaway.reward, inline: true },
            { name: '📦 Quantité', value: `${giveaway.quantity}`, inline: true },
            { name: '⏱️ Temps restant', value: timeRemaining, inline: true },
            { name: '👥 Participants', value: `${participantCount}`, inline: true }
        );

    if (giveaway.role_id) {
        embed.addFields(
            { name: '👥 Rôle requis', value: `<@&${giveaway.role_id}>`, inline: true }
        );
    }

    embed.setFooter({ text: `ID: ${giveaway.id}`, iconURL: 'https://cdn.discordapp.com/emojis/1084447535625191505.png' });
    embed.setTimestamp(new Date(giveaway.end_time));

    return embed;
}

/**
 * Créer les boutons du giveaway
 */
export function createGiveawayButtons(): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('✅ Participer')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('giveaway_leave')
                .setLabel('❌ Se retirer')
                .setStyle(ButtonStyle.Danger)
        );
}

/**
 * Formater le temps restant
 */
export function formatTimeRemaining(endTime: Date): string {
    const now = Date.now();
    const diff = endTime.getTime() - now;

    if (diff <= 0) return 'Expiré';

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
