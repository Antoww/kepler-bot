import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
    AttachmentBuilder
} from 'discord.js';
import config from '../../config.json' with { type: 'json' };
import {
    getDailyStats,
    getTopCommands,
    getTotalStats
} from '../../utils/statsTracker.ts';
import { renderBarChart, renderLineChart } from '../../utils/statsChart.ts';

export const data = new SlashCommandBuilder()
    .setName('globalstats')
    .setDescription('📊 Statistiques globales du bot (Owner uniquement)')
    .addSubcommand(subcommand =>
        subcommand
            .setName('vue-ensemble')
            .setDescription('Vue d\'ensemble des statistiques globales')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('commandes')
            .setDescription('Statistiques des commandes exécutées')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(1)
                    .setMaxValue(360)
            )
            .addBooleanOption(option =>
                option
                    .setName('depuis_toujours')
                    .setDescription('Analyser tout l\'historique disponible (prioritaire sur jours)')
            )

    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('messages')
            .setDescription('Statistiques des messages :')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(1)
                    .setMaxValue(360)
            )
            .addBooleanOption(option =>
                option
                    .setName('depuis_toujours')
                    .setDescription('Analyser tout l\'historique disponible (prioritaire sur jours)')
            )

    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('tendance')
            .setDescription('Graphique de tendance sur plusieurs jours')
            .addStringOption(option =>
                option
                    .setName('type')
                    .setDescription('Type de statistique')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Commandes', value: 'commands' },
                        { name: 'Messages', value: 'messages' }
                    )
            )
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours (défaut: 14)')
                    .setMinValue(7)
                    .setMaxValue(360)
            )
            .addBooleanOption(option =>
                option
                    .setName('depuis_toujours')
                    .setDescription('Analyser tout l\'historique disponible (prioritaire sur jours)')
            )

    );

export async function execute(interaction: ChatInputCommandInteraction) {
    // Vérifier que c'est l'owner du bot
    if (interaction.user.id !== config.ownerId) {
        return interaction.reply({
            content: '❌ Cette commande est réservée au propriétaire du bot.',
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'vue-ensemble':
                await handleOverview(interaction);
                break;
            case 'commandes':
                await handleCommandsStats(interaction);
                break;
            case 'messages':
                await handleMessagesStats(interaction);
                break;
            case 'tendance':
                await handleTrendStats(interaction);
                break;
            default:
                await interaction.editReply(KEPLER_MESSAGES.unknownSubcommand);
        }
    } catch (error) {
        console.error('[GlobalStats Command] Erreur:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la récupération des statistiques.');
    }
}

// ============================================
// Handlers pour les sous-commandes
// ============================================

async function handleOverview(interaction: ChatInputCommandInteraction) {
    const [dailyStats7, dailyStats30, totalStats, topCommands] = await Promise.all([
        getDailyStats(7),
        getDailyStats(30),
        getTotalStats(),
        getTopCommands(30, 5)
    ]);

    // Stats 7 jours
    const commands7 = dailyStats7.reduce((sum, d) => sum + d.commands, 0);
    const messages7 = dailyStats7.reduce((sum, d) => sum + d.messages, 0);

    // Stats 30 jours
    const commands30 = dailyStats30.reduce((sum, d) => sum + d.commands, 0);
    const messages30 = dailyStats30.reduce((sum, d) => sum + d.messages, 0);


    const overviewBuffer = await renderLineChart(
        'Activité globale',
        'Commandes et messages sur les 30 derniers jours',
        dailyStats30.map(d => formatChartDate(d.date)),
        [
            { label: 'Messages', color: '#45d7ff', values: dailyStats30.map(d => d.messages) },
            { label: 'Commandes', color: '#ff6b6b', values: dailyStats30.map(d => d.commands) }
        ]
    );
    const overviewAttachment = new AttachmentBuilder(overviewBuffer, { name: 'global-overview.webp' });

    // Top commandes
    const topCmdList = topCommands
        .map((c, i) => `${i + 1}. \`/${c.command_name}\` (${c.count.toLocaleString()})`)
        .join('\n') || 'Aucune donnée';

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.warning)
        .setTitle('📋 Statistiques Globales - Vue d\'ensemble')
        .addFields(
            {
                name: '📊 7 derniers jours',
                value: [
                    `**Commandes:** ${commands7.toLocaleString()}`,
                    `**Messages:** ${messages7.toLocaleString()}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📊 30 derniers jours',
                value: [
                    `**Commandes:** ${commands30.toLocaleString()}`,
                    `**Messages:** ${messages30.toLocaleString()}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📊 Total historique',
                value: [
                    `**Commandes:** ${totalStats.totalCommands.toLocaleString()}`,
                    `**Messages:** ${totalStats.totalMessages.toLocaleString()}`,
                    `**Jours trackés:** ${totalStats.totalDays}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🏆 Top 5 commandes (30j)',
                value: topCmdList,
                inline: false
            }
        )
        .setImage('attachment://global-overview.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [overviewAttachment] });
}

async function handleCommandsStats(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);

    const [topCommands, dailyStats, totalStats] = await Promise.all([
        getTopCommands(days, 10),
        getDailyStats(days),
        getTotalStats()
    ]);

    // Calculer les stats de la période
    const periodCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const avgPerDay = dailyStats.length > 0 ? Math.round(periodCommands / dailyStats.length) : 0;

    // Générer le graphique des top commandes
    const chartData = topCommands.map(c => ({
        label: `/${c.command_name}`,
        value: c.count
    }));

    const chartBuffer = await renderBarChart('Top des commandes', periodLabel, chartData, '#ff6b6b');
    const chartAttachment = new AttachmentBuilder(chartBuffer, { name: 'global-commands.webp' });


    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.danger)
        .setTitle('📊 Statistiques Globales - Commandes')
        .setDescription(`Période analysée: **${periodLabel}**`)
        .addFields(
            {
                name: '📈 Résumé',
                value: [
                    `**Total période:** ${periodCommands.toLocaleString()} commandes`,
                    `**Moyenne/jour:** ${avgPerDay.toLocaleString()} commandes`,
                    `**Total historique:** ${totalStats.totalCommands.toLocaleString()} commandes`
                ].join('\n'),
                inline: false
            },
            {
                name: '🏆 Top 10 des commandes',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            }
        )
        .setImage('attachment://global-commands.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [chartAttachment] });
}

async function handleMessagesStats(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);

    const [dailyStats, totalStats] = await Promise.all([
        getDailyStats(days),
        getTotalStats()
    ]);

    // Calculer les stats de la période
    const periodMessages = dailyStats.reduce((sum, d) => sum + d.messages, 0);
    const avgPerDay = dailyStats.length > 0 ? Math.round(periodMessages / dailyStats.length) : 0;
    const maxDay = dailyStats.length > 0
        ? dailyStats.reduce((max, d) => d.messages > max.messages ? d : max)
        : null;


    // Top 5 jours les plus actifs
    const topDays = [...dailyStats]
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 5);

    const topDaysBuffer = await renderBarChart(
        'Jours les plus actifs',
        periodLabel,
        topDays.map(d => ({
            label: formatChartDate(d.date),
            value: d.messages
        })),
        '#45d7ff'
    );
    const topDaysAttachment = new AttachmentBuilder(topDaysBuffer, { name: 'global-messages.webp' });

    const embed = createKeplerEmbed()
        .setColor(KEPLER_COLORS.primary)
        .setTitle('💬 Statistiques Globales - Messages')
        .setDescription(`Période analysée: **${periodLabel}**`)
        .addFields(
            {
                name: '📈 Résumé',
                value: [
                    `**Total période:** ${periodMessages.toLocaleString()} messages`,
                    `**Moyenne/jour:** ${avgPerDay.toLocaleString()} messages`,
                    `**Jour record:** ${maxDay ? `${new Date(maxDay.date).toLocaleDateString('fr-FR')} (${maxDay.messages.toLocaleString()})` : 'N/A'}`,
                    `**Total historique:** ${totalStats.totalMessages.toLocaleString()} messages`
                ].join('\n'),
                inline: false
            },
            {
                name: '🏆 Top 5 jours les plus actifs',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            }
        )
        .setImage('attachment://global-messages.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [topDaysAttachment] });
}

async function handleTrendStats(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true) as 'commands' | 'messages';
    const days = resolveStatsDays(interaction, 14);
    const periodLabel = formatStatsPeriod(days);

    const dailyStats = await getDailyStats(days);

    const metricLabel = type === 'commands' ? 'Commandes' : 'Messages';

    // Calculer des stats supplémentaires
    const values = dailyStats.map(d => type === 'commands' ? d.commands : d.messages);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = values.length > 0 ? Math.round(total / values.length) : 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);

    const title = type === 'commands' ? '📊 Tendance Globale - Commandes' : '💬 Tendance Globale - Messages';
    const color = type === 'commands' ? '#ff6b6b' : '#45d7ff';
    const trendBuffer = await renderLineChart(
        metricLabel,
        periodLabel,
        dailyStats.map(d => formatChartDate(d.date)),
        [{ label: metricLabel, color, values }]
    );
    const trendAttachment = new AttachmentBuilder(trendBuffer, { name: 'global-trend.webp' });


    const embed = createKeplerEmbed()
        .setColor(color)
        .setTitle(title)
        .setDescription(`Période: **${periodLabel}**`)
        .addFields(
            {
                name: '📈 Graphique',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            },
            {
                name: '📊 Statistiques',
                value: [
                    `**Total:** ${total.toLocaleString()}`,
                    `**Moyenne:** ${avg.toLocaleString()}/jour`,
                    `**Maximum:** ${max.toLocaleString()}`,
                    `**Minimum:** ${min.toLocaleString()}`
                ].join('\n'),
                inline: false
            }
        )
        .setImage('attachment://global-trend.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [trendAttachment] });
}

function formatChartDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function resolveStatsDays(interaction: ChatInputCommandInteraction, fallback: number): number | null {
    return interaction.options.getBoolean('depuis_toujours')
        ? null
        : interaction.options.getInteger('jours') || fallback;
}

function formatStatsPeriod(days: number | null): string {
    return days === null ? 'Depuis toujours' : `${days} derniers jours`;
}
