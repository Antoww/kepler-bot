import { 
    type ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder
} from 'discord.js';
import config from '../../config.json' with { type: 'json' };
import {
    getDailyStats,
    getTopCommands,
    getTotalStats,
    generateBarChart,
    generateSparkline,
    generateTrendChart
} from '../../utils/statsTracker.ts';

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
                    .setMaxValue(90)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('messages')
            .setDescription('Statistiques des messages')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(1)
                    .setMaxValue(90)
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
                    .setMaxValue(30)
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
                await interaction.editReply('❌ Sous-commande inconnue.');
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

    // Sparklines
    const cmdSparkline = generateSparkline(dailyStats30.slice(-14).map(d => d.commands));
    const msgSparkline = generateSparkline(dailyStats30.slice(-14).map(d => d.messages));

    // Top commandes
    const topCmdList = topCommands
        .map((c, i) => `${i + 1}. \`/${c.command_name}\` (${c.count.toLocaleString()})`)
        .join('\n') || 'Aucune donnée';

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
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
                name: '📈 Tendance commandes (14j)',
                value: `\`${cmdSparkline}\``,
                inline: true
            },
            {
                name: '📈 Tendance messages (14j)',
                value: `\`${msgSparkline}\``,
                inline: true
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '🏆 Top 5 commandes (30j)',
                value: topCmdList,
                inline: false
            }
        )
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleCommandsStats(interaction: ChatInputCommandInteraction) {
    const days = interaction.options.getInteger('jours') || 30;

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

    const chart = generateBarChart(chartData, 20);

    // Sparkline des derniers jours
    const recentValues = dailyStats.slice(-14).map(d => d.commands);
    const sparkline = generateSparkline(recentValues);

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle('📊 Statistiques Globales - Commandes')
        .setDescription(`Période analysée: **${days} jours**`)
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
                value: `\`\`\`\n${chart}\n\`\`\``,
                inline: false
            },
            {
                name: '📉 Tendance (14 derniers jours)',
                value: `\`${sparkline}\``,
                inline: false
            }
        )
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleMessagesStats(interaction: ChatInputCommandInteraction) {
    const days = interaction.options.getInteger('jours') || 30;

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

    // Sparkline des derniers jours
    const recentValues = dailyStats.slice(-14).map(d => d.messages);
    const sparkline = generateSparkline(recentValues);

    // Top 5 jours les plus actifs
    const topDays = [...dailyStats]
        .sort((a, b) => b.messages - a.messages)
        .slice(0, 5);

    const topDaysChart = generateBarChart(
        topDays.map(d => ({
            label: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
            value: d.messages
        })),
        20
    );

    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle('💬 Statistiques Globales - Messages')
        .setDescription(`Période analysée: **${days} jours**`)
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
                value: `\`\`\`\n${topDaysChart}\n\`\`\``,
                inline: false
            },
            {
                name: '📉 Tendance (14 derniers jours)',
                value: `\`${sparkline}\``,
                inline: false
            }
        )
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleTrendStats(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true) as 'commands' | 'messages';
    const days = interaction.options.getInteger('jours') || 14;

    const dailyStats = await getDailyStats(days);

    // Générer le graphique de tendance
    const trendChart = generateTrendChart(dailyStats, type);

    // Calculer des stats supplémentaires
    const values = dailyStats.map(d => type === 'commands' ? d.commands : d.messages);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = values.length > 0 ? Math.round(total / values.length) : 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);

    const title = type === 'commands' ? '📊 Tendance Globale - Commandes' : '💬 Tendance Globale - Messages';
    const color = type === 'commands' ? '#3498db' : '#2ecc71';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(`Période: **${days} derniers jours**`)
        .addFields(
            {
                name: '📈 Graphique',
                value: `\`\`\`\n${trendChart}\n\`\`\``,
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
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
