import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getReminder } from '../database/db.ts';

export const name = 'interactionCreate';
export async function execute(interaction) {
    if (!interaction.isButton()) return;

    const [action, reminderId] = interaction.customId.split('_');
    if (action !== 'repeat') return;

    try {
        // Get reminder from database
        const reminder = await getReminder(parseInt(reminderId));
        if (!reminder) {
            return interaction.reply({ content: 'Rappel introuvable.', ephemeral: true });
        }

        const { user_id: userId, message, duration_ms: duration } = reminder;

    // Set a timeout to send the reminder again
    setTimeout(async () => {
        const user = await interaction.client.users.fetch(userId);
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('Rappel')
            .setDescription(message)
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true })
            })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`repeat_${reminderId}`)
                    .setLabel('Répéter')
                    .setStyle(ButtonStyle.Primary)
            );

        try {
            await user.send({ embeds: [embed], components: [row] });
        } catch (error) {
            await interaction.followUp({ content: 'Je n\'ai pas pu envoyer le rappel en message privé. Voici votre rappel :', embeds: [embed], components: [row], ephemeral: true });
        }
    }, duration);

    await interaction.reply({ content: 'Le rappel a été répété avec succès!', ephemeral: true });
    } catch (error) {
        console.error('Erreur lors de la répétition du rappel:', error);
        await interaction.reply({ content: 'Erreur lors de la répétition du rappel. Veuillez réessayer.', ephemeral: true });
    }
}