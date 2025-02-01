import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Reminders } from "../types.d.ts";

const reminderFilePath = path.join(Deno.cwd(), './database/reminders.json');

export const data = new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Enregistre un rappel.')
    .addStringOption(option => option.setName('message')
        .setDescription('Le message du rappel')
        .setRequired(true))
    .addIntegerOption(option => option.setName('durée')
        .setDescription('La durée du rappel')
        .setRequired(true))
    .addStringOption(option => option.setName('unité')
        .setDescription('L\'unité de temps (minutes, heures, jours)')
        .setRequired(true)
        .addChoices(
            { name: 'Minutes', value: 'minutes' },
            { name: 'Heures', value: 'heures' },
            { name: 'Jours', value: 'jours' }
        ));
export async function execute(interaction: CommandInteraction) {
    const message = interaction.options.get('message')?.value as string ?? "";
    const duration = interaction.options.get('durée')?.value as number | null ?? 0;
    const unit = interaction.options.get('unité')?.value as string ?? "";
    const userId = interaction.user.id;

    // Convert duration to milliseconds
    let durationMs;
    switch (unit) {
        case 'minutes':
            durationMs = duration * 60 * 1000;
            break;
        case 'heures':
            durationMs = duration * 60 * 60 * 1000;
            break;
        case 'jours':
            durationMs = duration * 24 * 60 * 60 * 1000;
            break;
        default:
            return interaction.reply({ content: 'Unité de temps invalide.', ephemeral: true });
    }

    // Load existing reminders
    let reminders: Reminders = {};
    if (existsSync(reminderFilePath)) {
        const fileContent = readFileSync(reminderFilePath, 'utf8');
        if (fileContent) {
            reminders = JSON.parse(fileContent);
        }
    }

    // Save the reminder
    const reminderId = Date.now();
    reminders[reminderId] = { userId, message, duration: durationMs, timestamp: reminderId };
    writeFileSync(reminderFilePath, JSON.stringify(reminders, null, 2));

    await interaction.reply({ content: 'Votre rappel a été enregistré avec succès !', ephemeral: true });

    // Set a timeout to send the reminder
    setTimeout(async () => {
        const user = await interaction.client.users.fetch(userId);
        const embed = new EmbedBuilder()
            .setAuthor({ name: interaction.client.user?.username, iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) })
            .setColor('#0099ff')
            .setTitle('Rappel')
            .setDescription(message)
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`repeat_${reminderId}`)
                    .setLabel('Répéter')
                    .setStyle(ButtonStyle.Primary)
            );

        try {
            await user.send({ embeds: [embed], components: [row] });
        // deno-lint-ignore no-unused-vars
        } catch (error) {
            await interaction.followUp({ content: 'Je n\'ai pas pu envoyer le rappel en message privé. Voici votre rappel :', embeds: [embed], components: [row], ephemeral: true });
        }
    }, durationMs);
}