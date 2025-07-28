import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createReminder } from '../../database/supabase.ts';

export const data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Crée un rappel')
    .addStringOption(option => option.setName('message')
        .setDescription('Le message du rappel')
        .setRequired(true))
    .addIntegerOption(option => option.setName('minutes')
        .setDescription('Nombre de minutes avant le rappel')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const message = interaction.options.getString('message')!;
    const minutes = interaction.options.getInteger('minutes')!;
    
    if (minutes < 1 || minutes > 10080) { // 1 minute à 1 semaine
        await interaction.reply('Le délai doit être compris entre 1 minute et 1 semaine (10080 minutes).');
        return;
    }

    const durationMs = minutes * 60 * 1000;
    const reminderTime = new Date(Date.now() + durationMs);

    try {
        // Créer le rappel en base de données
        const reminder = await createReminder({
            user_id: interaction.user.id,
            message: message,
            duration_ms: durationMs,
            created_at: new Date().toISOString()
        });

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#00ff00')
            .setTitle('⏰ Rappel créé')
            .setDescription(`Votre rappel a été programmé pour <t:${Math.floor(reminderTime.getTime() / 1000)}:R>`)
            .addFields(
                { name: '💬 Message', value: message, inline: false },
                { name: '⏱️ Délai', value: `${minutes} minute(s)`, inline: true },
                { name: '🆔 ID', value: reminder.id.toString(), inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Programmer le rappel
        setTimeout(async () => {
            const reminderEmbed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🔔 Rappel')
                .setDescription(message)
                .setFooter({
                    text: 'Rappel programmé par ' + interaction.user.username,
                    iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`repeat_${reminder.id}`)
                        .setLabel('Répéter')
                        .setStyle(ButtonStyle.Primary)
                );

            try {
                await interaction.user.send({ embeds: [reminderEmbed], components: [row] });
                console.log(`✅ [RAPPEL LIVRÉ] ID: ${reminder.id} | Utilisateur: ${interaction.user.username} | Méthode: Message privé`);
            } catch (error) {
                await interaction.followUp({ content: 'Je n\'ai pas pu envoyer le rappel en message privé. Voici votre rappel :', embeds: [reminderEmbed], components: [row], ephemeral: true });
                console.log(`⚠️ [RAPPEL LIVRÉ] ID: ${reminder.id} | Utilisateur: ${interaction.user.username} | Méthode: Message public (MP fermés)`);
            }
        }, durationMs);

    } catch (error) {
        console.error('Erreur lors de la création du rappel:', error);
        await interaction.reply({ content: 'Erreur lors de la création du rappel. Veuillez réessayer.', ephemeral: true });
    }
} 