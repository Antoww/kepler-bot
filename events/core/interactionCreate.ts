import { type CommandInteraction, type ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createReminder } from '../../database/supabase.ts';
import { addGiveawayParticipant, removeGiveawayParticipant, isParticipant, getGiveaway, getGiveawayParticipantCount } from '../../database/db.ts';
import { formatTimeRemaining, generateGiveawayEmbed } from './giveawayManager.ts';
import { trackCommand } from '../../utils/statsTracker.ts';

export const name = 'interactionCreate';

export async function execute(interaction: CommandInteraction | ButtonInteraction) {
    if (interaction.isCommand()) {
        await handleCommandInteraction(interaction);
    } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
    }
}

async function handleCommandInteraction(interaction: CommandInteraction) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    let success = true;
    try {
        await command.execute(interaction);
        console.log(`Commande ${interaction.commandName} exécutée avec succès.`);
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${interaction.commandName} executée par ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
        success = false;
        console.error(`Erreur dans la commande ${interaction.commandName}:`, error);
        
        // Vérifier si l'interaction a déjà été gérée
        if (!interaction.deferred && !interaction.replied) {
            try {
                await interaction.reply({ 
                    content: 'Il y a eu une erreur en exécutant cette commande.', 
                    ephemeral: true 
                });
            } catch (replyError) {
                console.error("Erreur lors de la réponse d'erreur:", replyError);
            }
        } else {
            try {
                await interaction.editReply({ 
                    content: 'Il y a eu une erreur en exécutant cette commande.' 
                });
            } catch (editError) {
                console.error("Erreur lors de l'édition de la réponse d'erreur:", editError);
            }
        }
    } finally {
        // Tracker la commande (même en cas d'erreur)
        if (interaction.guildId) {
            trackCommand({
                command_name: interaction.commandName,
                user_id: interaction.user.id,
                guild_id: interaction.guildId,
                success
            }).catch(err => console.error('[StatsTracker] Erreur tracking commande:', err));
        }
    }
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
    const customId = interaction.customId;

    try {
        if (customId === 'giveaway_join') {
            await handleGiveawayJoin(interaction);
        } else if (customId === 'giveaway_leave') {
            await handleGiveawayLeave(interaction);
        } else if (customId.startsWith('repeat_')) {
            await handleRepeatReminder(interaction);
        } else if (customId.startsWith('snooze_')) {
            await handleSnoozeReminder(interaction);
        }
    } catch (error) {
        console.error('Erreur lors du traitement du bouton:', error);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Une erreur est survenue lors du traitement de votre demande.', 
                ephemeral: true 
            });
        }
    }
}

async function handleGiveawayJoin(interaction: ButtonInteraction) {
    const message = interaction.message;
    const footer = message.embeds[0]?.footer?.text;
    const giveawayId = footer?.split('ID: ')[1];

    if (!giveawayId) {
        await interaction.reply({ content: '❌ Impossible de trouver l\'ID du giveaway.', ephemeral: true });
        return;
    }

    try {
        // Vérifier si le giveaway existe
        const giveaway = await getGiveaway(giveawayId);
        if (!giveaway || giveaway.ended) {
            await interaction.reply({ content: '❌ Ce giveaway n\'existe pas ou est terminé.', ephemeral: true });
            return;
        }

        // Vérifier si l'utilisateur a le rôle requis
        if (giveaway.role_id && interaction.guild?.members.cache.get(interaction.user.id)?.roles.cache.has(giveaway.role_id) === false) {
            await interaction.reply({ 
                content: `❌ Vous devez avoir le rôle <@&${giveaway.role_id}> pour participer.`, 
                ephemeral: true 
            });
            return;
        }

        // Ajouter le participant
        const added = await addGiveawayParticipant(giveawayId, interaction.user.id);

        if (added) {
            // Récupérer le nombre de participants
            const count = await getGiveawayParticipantCount(giveawayId);
            
            // Mettre à jour l'embed du message
            const embed = generateGiveawayEmbed(giveaway, count, formatTimeRemaining(new Date(giveaway.end_time)));
            const buttons = new ActionRowBuilder<ButtonBuilder>()
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

            await message.edit({ embeds: [embed], components: [buttons] });

            await interaction.reply({ 
                content: `✅ Vous participez maintenant au giveaway **${giveaway.title}**!`, 
                ephemeral: true 
            });
        } else {
            await interaction.reply({ 
                content: '❌ Vous participez déjà à ce giveaway.', 
                ephemeral: true 
            });
        }
    } catch (error) {
        console.error('Erreur lors de la participation au giveaway:', error);
        await interaction.reply({ 
            content: '❌ Une erreur est survenue.', 
            ephemeral: true 
        });
    }
}

async function handleGiveawayLeave(interaction: ButtonInteraction) {
    const message = interaction.message;
    const footer = message.embeds[0]?.footer?.text;
    const giveawayId = footer?.split('ID: ')[1];

    if (!giveawayId) {
        await interaction.reply({ content: '❌ Impossible de trouver l\'ID du giveaway.', ephemeral: true });
        return;
    }

    try {
        // Vérifier si le giveaway existe
        const giveaway = await getGiveaway(giveawayId);
        if (!giveaway) {
            await interaction.reply({ content: '❌ Ce giveaway n\'existe pas.', ephemeral: true });
            return;
        }

        // Vérifier si l'utilisateur participe
        const participated = await isParticipant(giveawayId, interaction.user.id);
        if (!participated) {
            await interaction.reply({ 
                content: '❌ Vous ne participez pas à ce giveaway.', 
                ephemeral: true 
            });
            return;
        }

        // Retirer le participant
        await removeGiveawayParticipant(giveawayId, interaction.user.id);

        // Récupérer le nombre de participants
        const count = await getGiveawayParticipantCount(giveawayId);
        
        // Mettre à jour l'embed du message
        const embed = generateGiveawayEmbed(giveaway, count, formatTimeRemaining(new Date(giveaway.end_time)));
        const buttons = new ActionRowBuilder<ButtonBuilder>()
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

        await message.edit({ embeds: [embed], components: [buttons] });

        await interaction.reply({ 
            content: `✅ Vous avez quitté le giveaway **${giveaway.title}**.`, 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du giveaway:', error);
        await interaction.reply({ 
            content: '❌ Une erreur est survenue.', 
            ephemeral: true 
        });
    }
}

async function handleRepeatReminder(interaction: ButtonInteraction) {
    const embed = interaction.message.embeds[0];
    const originalMessage = embed.description || 'Rappel sans message';
    
    // Créer un nouveau rappel avec les mêmes paramètres
    const durationMs = 10 * 60 * 1000; // 10 minutes par défaut pour la répétition
    
    try {
        const reminder = await createReminder(
            interaction.user.id,
            originalMessage,
            durationMs
        );

        const confirmEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🔄 Rappel répété')
            .setDescription(`Votre rappel a été reprogrammé pour dans 10 minutes`)
            .addFields(
                { name: '💬 Message', value: originalMessage, inline: false },
                { name: '🆔 Nouvel ID', value: reminder.id.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        // Programmer le nouveau rappel
        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🔔 Rappel (Répété)')
                .setDescription(originalMessage)
                .addFields(
                    { name: '🆔 ID', value: reminder.id.toString(), inline: true }
                )
                .setFooter({
                    text: 'Rappel répété par ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`repeat_${reminder.id}`)
                        .setLabel('🔄 Répéter')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`snooze_${reminder.id}`)
                        .setLabel('😴 Reporter (10min)')
                        .setStyle(ButtonStyle.Secondary)
                );

            try {
                await interaction.user.send({ embeds: [reminderEmbed], components: [row] });
                console.log(`✅ [RAPPEL RÉPÉTÉ] ID: ${reminder.id} | Utilisateur: ${interaction.user.username}`);
            } catch (error) {
                console.log(`⚠️ [RAPPEL RÉPÉTÉ] Impossible d'envoyer le MP à ${interaction.user.username}`);
            }
        }, durationMs);

    } catch (error) {
        console.error('Erreur lors de la répétition du rappel:', error);
        await interaction.reply({ 
            content: '❌ Erreur lors de la répétition du rappel.', 
            ephemeral: true 
        });
    }
}

async function handleSnoozeReminder(interaction: ButtonInteraction) {
    const embed = interaction.message.embeds[0];
    const originalMessage = embed.description || 'Rappel sans message';
    
    // Reporter de 10 minutes
    const durationMs = 10 * 60 * 1000;
    
    try {
        const reminder = await createReminder(
            interaction.user.id,
            originalMessage,
            durationMs
        );

        const confirmEmbed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('😴 Rappel reporté')
            .setDescription(`Votre rappel a été reporté de 10 minutes`)
            .addFields(
                { name: '💬 Message', value: originalMessage, inline: false },
                { name: '⏰ Nouveau délai', value: `<t:${Math.floor((Date.now() + durationMs) / 1000)}:R>`, inline: true },
                { name: '🆔 Nouvel ID', value: reminder.id.toString(), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });

        // Programmer le rappel reporté
        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🔔 Rappel (Reporté)')
                .setDescription(originalMessage)
                .addFields(
                    { name: '🆔 ID', value: reminder.id.toString(), inline: true }
                )
                .setFooter({
                    text: 'Rappel reporté par ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`repeat_${reminder.id}`)
                        .setLabel('🔄 Répéter')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`snooze_${reminder.id}`)
                        .setLabel('😴 Reporter (10min)')
                        .setStyle(ButtonStyle.Secondary)
                );

            try {
                await interaction.user.send({ embeds: [reminderEmbed], components: [row] });
                console.log(`✅ [RAPPEL REPORTÉ] ID: ${reminder.id} | Utilisateur: ${interaction.user.username}`);
            } catch (error) {
                console.log(`⚠️ [RAPPEL REPORTÉ] Impossible d'envoyer le MP à ${interaction.user.username}`);
            }
        }, durationMs);

    } catch (error) {
        console.error('Erreur lors du report du rappel:', error);
        await interaction.reply({ 
            content: '❌ Erreur lors du report du rappel.', 
            ephemeral: true 
        });
    }
}
