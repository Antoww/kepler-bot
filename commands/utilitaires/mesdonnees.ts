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
    getUserDataSummary,
    deleteUserData,
    exportUserData
} from '../../utils/statsTracker.ts';

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
            .setDescription('Supprimer définitivement toutes vos données')
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
        const summary = await getUserDataSummary(interaction.user.id);

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('🔐 Vos données personnelles')
            .setDescription('Voici un résumé des données que nous avons collectées vous concernant.')
            .addFields(
                {
                    name: '📊 Statistiques',
                    value: [
                        `**Commandes exécutées:** ${summary.commandCount}`,
                        `**Messages comptabilisés:** ${summary.messageCount}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📅 Période d\'activité',
                    value: [
                        `**Première activité:** ${summary.firstActivity ? new Date(summary.firstActivity).toLocaleDateString('fr-FR') : 'N/A'}`,
                        `**Dernière activité:** ${summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString('fr-FR') : 'N/A'}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🏠 Serveurs',
                    value: `Données présentes sur **${summary.guilds.length}** serveur(s)`,
                    inline: false
                },
                {
                    name: '⏰ Conservation',
                    value: 'Vos données sont automatiquement supprimées après **90 jours** d\'inactivité.',
                    inline: false
                }
            )
            .setFooter({ text: 'Utilisez /mesdonnees supprimer pour effacer vos données' })
            .setTimestamp();

        if (summary.commandCount === 0 && summary.messageCount === 0) {
            embed.setDescription('✨ Aucune donnée n\'est actuellement stockée vous concernant.');
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('[MesDonnees] Erreur:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la récupération de vos données.');
    }
}

async function handleExportData(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const exportData = await exportUserData(interaction.user.id);
        const jsonString = JSON.stringify(exportData, null, 2);

        // Vérifier si les données ne sont pas vides
        const data = exportData as { commands: unknown[]; messages: unknown[] };
        if (data.commands.length === 0 && data.messages.length === 0) {
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
            .setDescription('Voici l\'export complet de vos données au format JSON.\n\n*Ce fichier contient toutes les informations que nous avons collectées vous concernant.*')
            .addFields(
                { name: '📊 Contenu', value: `${data.commands.length} commandes\n${data.messages.length} entrées de messages`, inline: true },
                { name: '📅 Date d\'export', value: new Date().toLocaleDateString('fr-FR'), inline: true }
            )
            .setFooter({ text: 'RGPD - Droit à la portabilité des données' })
            .setTimestamp();

        // Envoyer le fichier JSON
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
    // Créer les boutons de confirmation
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

    const embed = new EmbedBuilder()
        .setColor('#e74c3c')
        .setTitle('⚠️ Suppression de vos données')
        .setDescription([
            '**Êtes-vous sûr de vouloir supprimer toutes vos données ?**',
            '',
            'Cette action est **irréversible** et supprimera :',
            '• Toutes vos statistiques de commandes',
            '• Tous vos compteurs de messages',
            '',
            '*Les données anonymisées dans les statistiques globales seront conservées.*'
        ].join('\n'))
        .setFooter({ text: 'Cette action expire dans 60 secondes' })
        .setTimestamp();

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

            const result = await deleteUserData(interaction.user.id);

            const successEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('✅ Données supprimées')
                .setDescription([
                    'Toutes vos données personnelles ont été supprimées avec succès.',
                    '',
                    `**Données effacées :**`,
                    `• ${result.commandsDeleted} entrées de commandes`,
                    `• ${result.messagesDeleted} entrées de messages`
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
        // Timeout - désactiver les boutons
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
        .setDescription('Informations sur la collecte et le traitement de vos données.')
        .addFields(
            {
                name: '📊 Données collectées',
                value: [
                    '• **Commandes** : Nom de la commande, date/heure, serveur',
                    '• **Messages** : Compteur quotidien par canal (pas le contenu)',
                    '• **Identifiants** : Votre ID Discord (pour lier les données)'
                ].join('\n'),
                inline: false
            },
            {
                name: '🎯 Finalité',
                value: 'Ces données servent uniquement à générer des statistiques d\'utilisation du bot pour son propriétaire. Elles ne sont jamais vendues ni partagées.',
                inline: false
            },
            {
                name: '⏰ Durée de conservation',
                value: 'Les données sont automatiquement supprimées après **90 jours**. Une purge automatique est effectuée régulièrement.',
                inline: false
            },
            {
                name: '🔒 Vos droits (RGPD)',
                value: [
                    '• `/mesdonnees voir` - Droit d\'accès',
                    '• `/mesdonnees exporter` - Droit à la portabilité',
                    '• `/mesdonnees supprimer` - Droit à l\'effacement'
                ].join('\n'),
                inline: false
            },
            {
                name: '📧 Contact',
                value: 'Pour toute question concernant vos données, contactez le propriétaire du bot.',
                inline: false
            }
        )
        .setFooter({ text: 'Conforme au Règlement Général sur la Protection des Données (RGPD)' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
