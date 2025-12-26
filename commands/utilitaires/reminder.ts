import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createReminder } from '../../database/supabase.ts';

export const data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Crée un rappel')
    .addStringOption(option => option.setName('message')
        .setDescription('Le message du rappel')
        .setRequired(true))
    .addStringOption(option => option.setName('duree')
        .setDescription('Durée du rappel (ex: 30s, 15m, 2h, 1d, 1w, 1mo)')
        .setRequired(false))
    .addStringOption(option => option.setName('date')
        .setDescription('Date et heure précise (ex: 2025-12-31 23:59, 31/12/2025 14:30)')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const message = interaction.options.getString('message')!;
    const durationInput = interaction.options.getString('duree');
    const dateInput = interaction.options.getString('date');
    
    // Vérifier qu'au moins une option est fournie
    if (!durationInput && !dateInput) {
        await interaction.reply({
            content: '❌ Vous devez spécifier soit une **durée** soit une **date**.\n\n' +
                     '**Exemples de durée :**\n' +
                     '• `30s` - 30 secondes\n' +
                     '• `15m` - 15 minutes\n' +
                     '• `2h` - 2 heures\n' +
                     '• `1d` - 1 jour\n' +
                     '• `1w` - 1 semaine\n' +
                     '• `1mo` - 1 mois\n\n' +
                     '**Exemples de date :**\n' +
                     '• `2025-12-31 23:59`\n' +
                     '• `31/12/2025 14:30`\n' +
                     '• `31-12-2025 08:00`',
            ephemeral: true
        });
        return;
    }

    // Vérifier qu'une seule option est fournie
    if (durationInput && dateInput) {
        await interaction.reply({
            content: '❌ Vous ne pouvez pas spécifier à la fois une durée et une date. Choisissez l\'une ou l\'autre.',
            ephemeral: true
        });
        return;
    }

    let durationMs: number;
    let reminderTime: Date;
    let durationDisplay: string;

    // Si une durée est fournie
    if (durationInput) {
        const parsedDuration = parseDuration(durationInput);
        if (!parsedDuration) {
            await interaction.reply({
                content: '❌ Format de durée invalide. Utilisez des formats comme:\n' +
                         '• `30s` - 30 secondes\n' +
                         '• `15m` - 15 minutes\n' +
                         '• `2h` - 2 heures\n' +
                         '• `1d` - 1 jour\n' +
                         '• `1w` - 1 semaine\n' +
                         '• `1mo` - 1 mois',
                ephemeral: true
            });
            return;
        }

        durationMs = parsedDuration;
        reminderTime = new Date(Date.now() + durationMs);
        durationDisplay = `${durationInput} (${formatDuration(durationMs)})`;

        // Vérifier les limites (minimum 10 secondes, maximum 10 ans)
        const minDuration = 10 * 1000; // 10 secondes
        const maxDuration = 10 * 365 * 24 * 60 * 60 * 1000; // 10 ans

        if (durationMs < minDuration) {
            await interaction.reply({
                content: '❌ La durée minimale est de 10 secondes.',
                ephemeral: true
            });
            return;
        }

        if (durationMs > maxDuration) {
            await interaction.reply({
                content: '❌ La durée maximale est de 10 ans.',
                ephemeral: true
            });
            return;
        }
    } 
    // Si une date est fournie
    else {
        const parsedDate = parseDate(dateInput!);
        if (!parsedDate) {
            await interaction.reply({
                content: '❌ Format de date invalide. Utilisez des formats comme:\n' +
                         '• `2025-12-31 23:59`\n' +
                         '• `31/12/2025 14:30`\n' +
                         '• `31-12-2025 08:00`\n\n' +
                         '**Note :** L\'heure doit être au format 24h.',
                ephemeral: true
            });
            return;
        }

        reminderTime = parsedDate;
        durationMs = reminderTime.getTime() - Date.now();

        // Vérifier que la date est dans le futur
        if (durationMs < 10 * 1000) { // Minimum 10 secondes dans le futur
            await interaction.reply({
                content: '❌ La date doit être au moins 10 secondes dans le futur.',
                ephemeral: true
            });
            return;
        }

        // Vérifier que la date n'est pas trop lointaine (10 ans maximum)
        const maxDuration = 10 * 365 * 24 * 60 * 60 * 1000;
        if (durationMs > maxDuration) {
            await interaction.reply({
                content: '❌ La date ne peut pas être plus de 10 ans dans le futur.',
                ephemeral: true
            });
            return;
        }

        durationDisplay = formatDuration(durationMs);
    }

    try {
        // Créer le rappel en base de données
        const reminder = await createReminder(
            interaction.user.id,
            message,
            durationMs
        );

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#00ff00')
            .setTitle('⏰ Rappel créé')
            .setDescription(`Votre rappel a été programmé pour <t:${Math.floor(reminderTime.getTime() / 1000)}:F>`)
            .addFields(
                { name: '💬 Message', value: message, inline: false },
                { name: '⏱️ Délai', value: durationDisplay, inline: true },
                { name: '🆔 ID', value: reminder.id.toString(), inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Ajouter le rappel au gestionnaire si disponible
        if (interaction.client.reminderManager) {
            interaction.client.reminderManager.addReminder(reminder);
        } else {
            // Fallback: programmer le rappel localement (comme avant)
            setTimeout(async () => {
                const reminderEmbed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('🔔 Rappel')
                    .setDescription(message)
                    .addFields(
                        { name: '⏰ Programmé il y a', value: formatDuration(durationMs), inline: true },
                        { name: '🆔 ID', value: reminder.id.toString(), inline: true }
                    )
                    .setFooter({
                        text: 'Rappel programmé par ' + interaction.user.username,
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
                    console.log(`✅ [RAPPEL LIVRÉ] ID: ${reminder.id} | Utilisateur: ${interaction.user.username} | Méthode: Message privé`);
                } catch (error) {
                    await interaction.followUp({ 
                        content: '🔔 **Rappel !** Je n\'ai pas pu envoyer le rappel en message privé. Voici votre rappel :', 
                        embeds: [reminderEmbed], 
                        components: [row], 
                        ephemeral: true 
                    });
                    console.log(`⚠️ [RAPPEL LIVRÉ] ID: ${reminder.id} | Utilisateur: ${interaction.user.username} | Méthode: Message public (MP fermés)`);
                }
            }, durationMs);
        }

    } catch (error) {
        console.error('Erreur lors de la création du rappel:', error);
        await interaction.reply({ 
            content: '❌ Erreur lors de la création du rappel. Veuillez réessayer.', 
            ephemeral: true 
        });
    }
}

function parseDuration(duration: string): number | null {
    const regex = /^(\d+)(s|m|h|d|w|mo)$/i;
    const match = duration.toLowerCase().match(regex);
    
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': // secondes
            return value * 1000;
        case 'm': // minutes
            return value * 60 * 1000;
        case 'h': // heures
            return value * 60 * 60 * 1000;
        case 'd': // jours
            return value * 24 * 60 * 60 * 1000;
        case 'w': // semaines
            return value * 7 * 24 * 60 * 60 * 1000;
        case 'mo': // mois (approximation 30 jours)
            return value * 30 * 24 * 60 * 60 * 1000;
        default:
            return null;
    }
}

function formatDuration(durationMs: number): string {
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (months > 0) {
        const remainingDays = days % 30;
        return remainingDays > 0 ? `${months} mois et ${remainingDays} jour(s)` : `${months} mois`;
    } else if (weeks > 0) {
        const remainingDays = days % 7;
        return remainingDays > 0 ? `${weeks} semaine(s) et ${remainingDays} jour(s)` : `${weeks} semaine(s)`;
    } else if (days > 0) {
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days} jour(s) et ${remainingHours}h` : `${days} jour(s)`;
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h et ${remainingMinutes}min` : `${hours}h`;
    } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return remainingSeconds > 0 ? `${minutes}min et ${remainingSeconds}s` : `${minutes}min`;
    } else {
        return `${seconds}s`;
    }
}

function parseDate(dateStr: string): Date | null {
    // Nettoyer la chaîne
    dateStr = dateStr.trim();

    // Formats supportés:
    // 1. YYYY-MM-DD HH:MM ou YYYY/MM/DD HH:MM
    // 2. DD-MM-YYYY HH:MM ou DD/MM/YYYY HH:MM
    // 3. YYYY-MM-DD HH:MM:SS ou DD-MM-YYYY HH:MM:SS (avec secondes)

    // Regex pour matcher différents formats
    const patterns = [
        // Format ISO: YYYY-MM-DD HH:MM[:SS]
        /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
        // Format FR: DD-MM-YYYY HH:MM[:SS]
        /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/
    ];

    for (let i = 0; i < patterns.length; i++) {
        const match = dateStr.match(patterns[i]);
        if (match) {
            let year: number, month: number, day: number, hours: number, minutes: number, seconds: number;

            if (i === 0) {
                // Format ISO: YYYY-MM-DD
                year = parseInt(match[1]);
                month = parseInt(match[2]) - 1; // Les mois commencent à 0
                day = parseInt(match[3]);
                hours = parseInt(match[4]);
                minutes = parseInt(match[5]);
                seconds = match[6] ? parseInt(match[6]) : 0;
            } else {
                // Format FR: DD-MM-YYYY
                day = parseInt(match[1]);
                month = parseInt(match[2]) - 1;
                year = parseInt(match[3]);
                hours = parseInt(match[4]);
                minutes = parseInt(match[5]);
                seconds = match[6] ? parseInt(match[6]) : 0;
            }

            // Créer la date
            const date = new Date(year, month, day, hours, minutes, seconds);

            // Vérifier que la date est valide
            if (isNaN(date.getTime())) {
                return null;
            }

            // Vérifier que les valeurs correspondent (pour éviter des dates comme 32/13/2025)
            if (date.getFullYear() !== year || 
                date.getMonth() !== month || 
                date.getDate() !== day ||
                date.getHours() !== hours ||
                date.getMinutes() !== minutes) {
                return null;
            }

            return date;
        }
    }

    return null;
} 