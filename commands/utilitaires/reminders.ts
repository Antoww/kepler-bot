import { 
    type CommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType 
} from 'discord.js';
import { getUserReminders, deleteReminder } from '../../database/supabase.ts';

export const data = new SlashCommandBuilder()
    .setName('reminders')
    .setDescription('Gère vos rappels')
    .addSubcommand(subcommand =>
        subcommand
            .setName('liste')
            .setDescription('Affiche la liste de vos rappels actifs')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('supprimer')
            .setDescription('Supprime un rappel par son ID')
            .addIntegerOption(option => option.setName('id')
                .setDescription('L\'ID du rappel à supprimer')
                .setRequired(true))
    );

export async function execute(interaction: CommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'liste') {
        await handleListReminders(interaction);
    } else if (subcommand === 'supprimer') {
        await handleDeleteReminder(interaction);
    }
}

async function handleListReminders(interaction: CommandInteraction) {
    try {
        const reminders = await getUserReminders(interaction.user.id);

        if (!reminders || reminders.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📋 Vos rappels')
                .setDescription('❌ Vous n\'avez aucun rappel actif.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Trier par timestamp (les plus proches en premier)
        const sortedReminders = reminders.sort((a, b) => a.timestamp - b.timestamp);

        let currentPage = 0;
        const itemsPerPage = 5;
        const totalPages = Math.ceil(sortedReminders.length / itemsPerPage);

        const generateEmbed = (page: number) => {
            const start = page * itemsPerPage;
            const end = start + itemsPerPage;
            const currentReminders = sortedReminders.slice(start, end);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📋 Vos rappels actifs')
                .setFooter({ text: `Page ${page + 1}/${totalPages} • ${sortedReminders.length} rappels total` })
                .setTimestamp();

            const remindersText = currentReminders.map(reminder => {
                const triggerTime = Math.floor(reminder.timestamp / 1000);
                const createdTime = Math.floor(new Date(reminder.created_at).getTime() / 1000);
                const isOverdue = reminder.timestamp < Date.now();
                
                const status = isOverdue ? '🔴 **Expiré**' : '🟢 **Actif**';
                
                return [
                    `**ID ${reminder.id}** - ${status}`,
                    `💬 ${reminder.message}`,
                    `⏰ Prévu: <t:${triggerTime}:F> (<t:${triggerTime}:R>)`,
                    `📅 Créé: <t:${createdTime}:R>`,
                    ''
                ].join('\n');
            }).join('\n');

            embed.setDescription(remindersText || 'Aucun rappel sur cette page.');

            return embed;
        };

        const generateButtons = (page: number) => {
            return new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('previous_reminders')
                        .setLabel('⬅️ Précédent')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_reminders')
                        .setLabel('➡️ Suivant')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1),
                    new ButtonBuilder()
                        .setCustomId('refresh_reminders')
                        .setLabel('🔄 Actualiser')
                        .setStyle(ButtonStyle.Primary)
                );
        };

        const embed = generateEmbed(currentPage);
        const components = totalPages > 1 ? [generateButtons(currentPage)] : [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_reminders')
                    .setLabel('🔄 Actualiser')
                    .setStyle(ButtonStyle.Primary)
            )
        ];

        const response = await interaction.reply({ 
            embeds: [embed], 
            components,
            fetchReply: true 
        });

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
                case 'previous_reminders':
                    currentPage = Math.max(0, currentPage - 1);
                    break;
                case 'next_reminders':
                    currentPage = Math.min(totalPages - 1, currentPage + 1);
                    break;
                case 'refresh_reminders':
                    // Actualiser la liste
                    await handleListReminders(i);
                    return;
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

    } catch (error) {
        console.error('Erreur lors de la récupération des rappels:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de la récupération de vos rappels.',
            ephemeral: true
        });
    }
}

async function handleDeleteReminder(interaction: CommandInteraction) {
    const reminderId = interaction.options.getInteger('id')!;

    try {
        // Vérifier que le rappel appartient à l'utilisateur
        const userReminders = await getUserReminders(interaction.user.id);
        const reminder = userReminders.find(r => r.id === reminderId);

        if (!reminder) {
            await interaction.reply({
                content: '❌ Rappel introuvable ou vous n\'êtes pas autorisé à le supprimer.',
                ephemeral: true
            });
            return;
        }

        // Supprimer le rappel
        await deleteReminder(reminderId);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🗑️ Rappel supprimé')
            .setDescription(`Le rappel **ID ${reminderId}** a été supprimé avec succès.`)
            .addFields(
                { name: '💬 Message', value: reminder.message, inline: false },
                { name: '⏰ Était prévu pour', value: `<t:${Math.floor(reminder.timestamp / 1000)}:F>`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur lors de la suppression du rappel:', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de la suppression du rappel.',
            ephemeral: true
        });
    }
}
