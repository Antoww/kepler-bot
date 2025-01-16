const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const reminderFilePath = path.join(__dirname, '../database/reminder.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Enregistre un rappel.')
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Le message du rappel')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('durée')
                .setDescription('La durée du rappel')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('unité')
                .setDescription('L\'unité de temps (minutes, heures, jours)')
                .setRequired(true)
                .addChoices(
                    { name: 'Minutes', value: 'minutes' },
                    { name: 'Heures', value: 'heures' },
                    { name: 'Jours', value: 'jours' }
                )),
    async execute(interaction) {
        const message = interaction.options.getString('message');
        const duration = interaction.options.getInteger('durée');
        const unit = interaction.options.getString('unité');
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
        let reminders = {};
        if (fs.existsSync(reminderFilePath)) {
            const fileContent = fs.readFileSync(reminderFilePath, 'utf8');
            if (fileContent) {
                reminders = JSON.parse(fileContent);
            }
        }

        // Save the reminder
        const reminderId = Date.now();
        reminders[reminderId] = { userId, message, duration: durationMs, timestamp: reminderId };
        fs.writeFileSync(reminderFilePath, JSON.stringify(reminders, null, 2));

        await interaction.reply({ content: 'Votre rappel a été enregistré avec succès!', ephemeral: true });

        // Set a timeout to send the reminder
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
        }, durationMs);
        console.log('[LOG]',`Commande ${__filename} executée par ${interaction.user.tag} (${interaction.user.id})`);
    },
};