import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

const reminderFilePath = join(import.meta.dirname, '../database/reminder.json');

export const name = 'interactionCreate';
export async function execute(interaction) {
    if (!interaction.isButton()) return;

    const [action, reminderId] = interaction.customId.split('_');
    if (action !== 'repeat') return;

    // Load existing reminders
    let reminders = {};
    if (existsSync(reminderFilePath)) {
        const fileContent = readFileSync(reminderFilePath, 'utf8');
        if (fileContent) {
            reminders = JSON.parse(fileContent);
        }
    }

    const reminder = reminders[reminderId];
    if (!reminder) {
        return interaction.reply({ content: 'Rappel introuvable.', ephemeral: true });
    }

    const { userId, message, duration } = reminder;

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
}