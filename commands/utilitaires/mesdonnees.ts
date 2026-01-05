import { Buffer } from 'node:buffer';
import { 
    type ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import {
    getCompleteUserDataSummary,
    exportCompleteUserData,
    deleteVoluntaryUserData,
    generatePrivacyReport
} from '../../utils/rgpdManager.ts';

export const data = new SlashCommandBuilder()
    .setName('mesdonnees')
    .setDescription('🔐 Gérer vos données personnelles (RGPD)')
    .addSubcommand(subcommand =>
        subcommand
            .setName('voir')
            .setDescription('Voir un résumé de vos données collectées')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('exporter')
            .setDescription('Exporter toutes vos données au format JSON')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('supprimer')
            .setDescription('Supprimer vos données volontaires (stats, anniversaires, rappels)')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('info')
            .setDescription('Informations sur la collecte de données')
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'voir':
            await handleViewData(interaction);
            break;
        case 'exporter':
            await handleExportData(interaction);
            break;
        case 'supprimer':
            await handleDeleteData(interaction);
            break;
        case 'info':
            await handleInfo(interaction);
            break;
    }
}

async function handleViewData(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const summary = await getCompleteUserDataSummary(interaction.user.id);
        const report = generatePrivacyReport(summary);

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🔐 Vos données personnelles')
            .setDescription(report)
            .addFields(
                {
                    name: '📅 Période d\'activité',
                    value: summary.firstActivity 
                        ? `Du **${new Date(summary.firstActivity).toLocaleDateString('fr-FR')}** au **${new Date(summary.lastActivity!).toLocaleDateString('fr-FR')}**`
                        : 'Aucune activité enregistrée',
                    inline: true
                },
                {
                    name: '🏠 Serveurs',
                    value: summary.guilds.length > 0 
                        ? `Données sur **${summary.guilds.length}** serveur(s)`
                        : 'Aucun serveur',
                    inline: true
                },
                {
                    name: '⏰ Conservation',
                    value: [
                        '• Statistiques : **90 jours**',
                        '• Modération : **2 ans**',
                        '• Anniversaires : **Jusqu\'à suppression**'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'Utilisez /mesdonnees supprimer pour effacer vos données' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[MesDonnees] Erreur:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la récupération de vos données.');
    }
}

async function handleExportData(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const exportData = await exportCompleteUserData(interaction.user.id);
        const jsonString = JSON.stringify(exportData, null, 2);

        // Calculer les totaux
        const totalItems = 
            exportData.stats.commands.length +
            exportData.stats.messages.length +
            exportData.personal.birthdays.length +
            exportData.personal.reminders.length +
            exportData.moderation.warnings.length +
            exportData.moderation.history.length +
            exportData.participations.giveaways.length;

        if (totalItems === 0) {
            const embed = new EmbedBuilder()
                .setColor('#f39c12')
                .setTitle('📦 Export de vos données')
                .setDescription('✨ Aucune donnée à exporter. Nous n\'avons pas de données vous concernant.')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('📦 Export de vos données')
            .setDescription('Voici l\'export complet de vos données au format JSON.')
            .addFields(
                { 
                    name: '📊 Statistiques', 
                    value: `${exportData.stats.commands.length} commandes\n${exportData.stats.messages.length} entrées messages`, 
                    inline: true 
                },
                { 
                    name: '🎂 Personnel', 
                    value: `${exportData.personal.birthdays.length} anniversaires\n${exportData.personal.reminders.length} rappels`, 
                    inline: true 
                },
                { 
                    name: '⚖️ Modération', 
                    value: `${exportData.moderation.warnings.length} warnings\n${exportData.moderation.history.length} entrées historique`, 
                    inline: true 
                },
                { name: '📅 Date d\'export', value: new Date().toLocaleDateString('fr-FR'), inline: true }
            )
            .setFooter({ text: 'RGPD - Droit à la portabilité des données' })
            .setTimestamp();

        const buffer = Buffer.from(jsonString, 'utf-8');
        
        await interaction.editReply({
            embeds: [embed],
            files: [{
                attachment: buffer,
                name: `mes_donnees_${interaction.user.id}_${Date.now()}.json`
            }]
        });
    } catch (error) {
        console.error('[MesDonnees] Erreur export:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de l\'export de vos données.');
    }
}

async function handleDeleteData(interaction: ChatInputCommandInteraction) {
    // Récupérer d'abord un résumé pour informer l'utilisateur
    const summary = await getCompleteUserDataSummary(interaction.user.id);

    const confirmButton = new ButtonBuilder()
        .setCustomId('confirm_delete_data')
        .setLabel('✅ Confirmer la suppression')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId('cancel_delete_data')
        .setLabel('❌ Annuler')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(confirmButton, cancelButton);

    // Liste des données qui seront supprimées
    const toDelete: string[] = [];
    if (summary.commandCount > 0) toDelete.push(`• ${summary.commandCount} statistiques de commandes`);
    if (summary.messageCount > 0) toDelete.push(`• ${summary.messageCount} compteurs de messages`);
    if (summary.birthdayCount > 0) toDelete.push(`• ${summary.birthdayCount} anniversaire(s)`);
    if (summary.reminderCount > 0) toDelete.push(`• ${summary.reminderCount} rappel(s)`);
    if (summary.giveawayParticipations > 0) toDelete.push(`• ${summary.giveawayParticipations} participation(s) aux giveaways`);

    // Liste des données conservées
    const kept: string[] = [];
    if (summary.warningCount > 0) kept.push(`• ${summary.warningCount} avertissement(s)`);
    if (summary.moderationHistoryCount > 0) kept.push(`• ${summary.moderationHistoryCount} entrée(s) de modération`);
    if (summary.activeTempBans > 0) kept.push(`• ${summary.activeTempBans} ban(s) temporaire(s)`);
    if (summary.activeTempMutes > 0) kept.push(`• ${summary.activeTempMutes} mute(s) temporaire(s)`);

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚠️ Suppression de vos données')
        .setDescription([
            '**Êtes-vous sûr de vouloir supprimer vos données ?**',
            '',
            toDelete.length > 0 ? `**Données qui seront supprimées :**\n${toDelete.join('\n')}` : '*Aucune donnée à supprimer*',
            '',
            kept.length > 0 ? `**Données conservées (sécurité) :**\n${kept.join('\n')}\n*Les données de modération ne peuvent pas être supprimées pour des raisons de sécurité du serveur.*` : ''
        ].filter(Boolean).join('\n'))
        .setFooter({ text: 'Cette action expire dans 60 secondes' })
        .setTimestamp();

    if (toDelete.length === 0) {
        embed.setColor('#95a5a6');
        embed.setDescription('✨ Vous n\'avez aucune donnée supprimable.\n\n' + 
            (kept.length > 0 ? `**Données de modération conservées :**\n${kept.join('\n')}` : ''));
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });

    try {
        const confirmation = await response.awaitMessageComponent({
            filter: i => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
            time: 60_000
        });

        if (confirmation.customId === 'confirm_delete_data') {
            await confirmation.deferUpdate();

            const result = await deleteVoluntaryUserData(interaction.user.id);

            const totalDeleted = 
                result.commandsDeleted + 
                result.messagesDeleted + 
                result.birthdaysDeleted + 
                result.remindersDeleted +
                result.giveawayParticipationsDeleted;

            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Données supprimées')
                .setDescription([
                    `**${totalDeleted} entrée(s) supprimée(s) avec succès.**`,
                    '',
                    '**Détail :**',
                    `• ${result.commandsDeleted} commande(s)`,
                    `• ${result.messagesDeleted} message(s)`,
                    `• ${result.birthdaysDeleted} anniversaire(s)`,
                    `• ${result.remindersDeleted} rappel(s)`,
                    `• ${result.giveawayParticipationsDeleted} participation(s)`
                ].join('\n'))
                .setFooter({ text: 'RGPD - Droit à l\'effacement' })
                .setTimestamp();

            await confirmation.editReply({ embeds: [successEmbed], components: [] });
        } else {
            const cancelEmbed = new EmbedBuilder()
                .setColor('#95a5a6')
                .setTitle('❌ Suppression annulée')
                .setDescription('Vos données n\'ont pas été modifiées.')
                .setTimestamp();

            await confirmation.update({ embeds: [cancelEmbed], components: [] });
        }
    } catch {
        const timeoutEmbed = new EmbedBuilder()
            .setColor('#95a5a6')
            .setTitle('⏰ Temps écoulé')
            .setDescription('La demande de suppression a expiré. Vos données n\'ont pas été modifiées.')
            .setTimestamp();

        await interaction.editReply({ embeds: [timeoutEmbed], components: [] });
    }
}

async function handleInfo(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('🔐 Politique de confidentialité')
        .setDescription('Informations sur la collecte et le traitement de vos données conformément au RGPD.')
        .addFields(
            {
                name: '📊 Données collectées',
                value: [
                    '**Statistiques (90 jours)**',
                    '• Commandes exécutées (nom, date, serveur)',
                    '• Compteur de messages par canal',
                    '',
                    '**Données personnelles**',
                    '• Anniversaire (si configuré)',
                    '• Rappels créés',
                    '• Participations aux giveaways',
                    '',
                    '**Modération (2 ans)**',
                    '• Avertissements reçus',
                    '• Historique des sanctions'
                ].join('\n'),
                inline: false
            },
            {
                name: '🎯 Finalités',
                value: [
                    '• **Statistiques** : Analyse d\'utilisation du bot',
                    '• **Anniversaires** : Souhaiter votre anniversaire',
                    '• **Rappels** : Service demandé par vous',
                    '• **Modération** : Sécurité des serveurs'
                ].join('\n'),
                inline: false
            },
            {
                name: '⏰ Conservation',
                value: [
                    '• **Statistiques** : 90 jours',
                    '• **Modération** : 2 ans',
                    '• **Anniversaires/Rappels** : Jusqu\'à suppression manuelle',
                    '',
                    'Une purge automatique est effectuée quotidiennement.'
                ].join('\n'),
                inline: false
            },
            {
                name: '🔒 Vos droits (RGPD)',
                value: [
                    '• `/mesdonnees voir` - **Droit d\'accès**',
                    '• `/mesdonnees exporter` - **Droit à la portabilité**',
                    '• `/mesdonnees supprimer` - **Droit à l\'effacement**',
                    '',
                    '⚠️ *Les données de modération ne peuvent pas être supprimées par l\'utilisateur pour des raisons de sécurité.*'
                ].join('\n'),
                inline: false
            },
            {
                name: '📧 Contact DPO',
                value: 'Pour toute question concernant vos données, contactez le propriétaire du bot ou l\'administrateur du serveur.',
                inline: false
            }
        )
        .setFooter({ text: 'Conforme au Règlement Général sur la Protection des Données (UE 2016/679)' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
