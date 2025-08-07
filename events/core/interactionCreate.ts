import { type CommandInteraction, type ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createReminder } from '../../database/supabase.ts';

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

    try {
        await command.execute(interaction);
        console.log(`Commande ${interaction.commandName} exécutée avec succès.`);
        console.log(`[LOG : ${new Date().toLocaleTimeString()}] Commande ${interaction.commandName} executée par ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
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
    }
}

async function handleButtonInteraction(interaction: ButtonInteraction) {
    const customId = interaction.customId;

    try {
        if (customId.startsWith('repeat_')) {
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
