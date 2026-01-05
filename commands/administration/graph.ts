import { 
    type ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder
} from 'discord.js';
import config from '../../config.json' with { type: 'json' };
import {
    getDailyStats,
    getTopCommands,
    getTopUsers,
    getTotalStats,
    generateBarChart,
    generateSparkline,
    generateTrendChart
} from '../../utils/statsTracker.ts';

export const data = new SlashCommandBuilder()
    .setName('graph')
    .setDescription('📊 Affiche les statistiques détaillées du bot (Owner uniquement)')
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
            .addBooleanOption(option =>
                option
                    .setName('global')
                    .setDescription('Voir les stats globales (toutes les guilds)')
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
            .addBooleanOption(option =>
                option
                    .setName('global')
                    .setDescription('Voir les stats globales (toutes les guilds)')
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('utilisateurs')
            .setDescription('Statistiques des utilisateurs les plus actifs')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(1)
                    .setMaxValue(90)
            )
            .addIntegerOption(option =>
                option
                    .setName('limite')
                    .setDescription('Nombre d\'utilisateurs à afficher (défaut: 10)')
                    .setMinValue(1)
                    .setMaxValue(25)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('resume')
            .setDescription('Résumé général des statistiques')
            .addBooleanOption(option =>
                option
                    .setName('global')
                    .setDescription('Voir les stats globales (toutes les guilds)')
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
            case 'commandes':
                await handleCommandsStats(interaction);
                break;
            case 'messages':
                await handleMessagesStats(interaction);
                break;
            case 'utilisateurs':
                await handleUsersStats(interaction);
                break;
            case 'resume':
                await handleResumeStats(interaction);
                break;
            case 'tendance':
                await handleTrendStats(interaction);
                break;
            default:
                await interaction.editReply('❌ Sous-commande inconnue.');
        }
    } catch (error) {
        console.error('[Graph Command] Erreur:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la récupération des statistiques.');
    }
}

async function handleCommandsStats(interaction: ChatInputCommandInteraction) {
    const days = interaction.options.getInteger('jours') || 30;
    const global = interaction.options.getBoolean('global') || false;
    const guildId = global ? undefined : interaction.guildId!;

    const [topCommands, dailyStats, totalStats] = await Promise.all([
        getTopCommands(days, 10, guildId),
        getDailyStats(days, guildId),
        getTotalStats(guildId)
    ]);

    // Calculer les stats de la période
    const periodCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const avgPerDay = dailyStats.length > 0 ? Math.round(periodCommands / dailyStats.length) : 0;

    // Générer le graphique des top commandes
    const chartData = topCommands.map(c => ({
        label: `/${c.command_name}`,
        value: c.count
    }));

    const chart = generateBarChart(chartData, 15);

    // Sparkline des derniers jours
    const recentValues = dailyStats.slice(-14).map(d => d.commands);
    const sparkline = generateSparkline(recentValues);

    const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`📊 Statistiques des commandes ${global ? '(Global)' : '(Ce serveur)'}`)
        .setDescription(`Période analysée: **${days} jours**`)
        .addFields(
            { 
                name: '📈 Résumé', 
                value: [
                    `**Total période:** ${periodCommands.toLocaleString()} commandes`,
                    `**Moyenne/jour:** ${avgPerDay} commandes`,
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
    const global = interaction.options.getBoolean('global') || false;
    const guildId = global ? undefined : interaction.guildId!;

    const [dailyStats, totalStats] = await Promise.all([
        getDailyStats(days, guildId),
        getTotalStats(guildId)
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
        15
    );

    const embed = new EmbedBuilder()
        .setColor('#2ecc71')
        .setTitle(`💬 Statistiques des messages ${global ? '(Global)' : '(Ce serveur)'}`)
        .setDescription(`Période analysée: **${days} jours**`)
        .addFields(
            { 
                name: '📈 Résumé', 
                value: [
                    `**Total période:** ${periodMessages.toLocaleString()} messages`,
                    `**Moyenne/jour:** ${avgPerDay} messages`,
                    `**Jour record:** ${maxDay ? `${new Date(maxDay.date).toLocaleDateString('fr-FR')} (${maxDay.messages})` : 'N/A'}`,
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

async function handleUsersStats(interaction: ChatInputCommandInteraction) {
    const days = interaction.options.getInteger('jours') || 30;
    const limit = interaction.options.getInteger('limite') || 10;
    const guildId = interaction.guildId!;

    const topUsers = await getTopUsers(days, limit, guildId);

    // Résoudre les noms d'utilisateurs
    const userLines: string[] = [];
    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        let username = user.user_id;
        
        try {
            const member = await interaction.guild?.members.fetch(user.user_id);
            username = member?.displayName || member?.user.username || user.user_id;
        } catch {
            // Garder l'ID si l'utilisateur n'est plus sur le serveur
        }

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        userLines.push(`${medal} **${username}** - ${user.message_count.toLocaleString()} messages`);
    }

    const embed = new EmbedBuilder()
        .setColor('#9b59b6')
        .setTitle('👥 Utilisateurs les plus actifs')
        .setDescription(`Période analysée: **${days} jours**\n\n${userLines.join('\n') || 'Aucune donnée disponible'}`)
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function handleResumeStats(interaction: ChatInputCommandInteraction) {
    const global = interaction.options.getBoolean('global') || false;
    const guildId = global ? undefined : interaction.guildId!;

    const [dailyStats7, dailyStats30, totalStats, topCommands] = await Promise.all([
        getDailyStats(7, guildId),
        getDailyStats(30, guildId),
        getTotalStats(guildId),
        getTopCommands(30, 5, guildId)
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

    // Top commandes format simple
    const topCmdList = topCommands
        .map((c, i) => `${i + 1}. \`/${c.command_name}\` (${c.count})`)
        .join('\n') || 'Aucune donnée';

    const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle(`📋 Résumé des statistiques ${global ? '(Global)' : '(Ce serveur)'}`)
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
                name: '📈 Tendance commandes',
                value: `\`${cmdSparkline}\``,
                inline: true
            },
            {
                name: '📈 Tendance messages',
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

async function handleTrendStats(interaction: ChatInputCommandInteraction) {
    const type = interaction.options.getString('type', true) as 'commands' | 'messages';
    const days = interaction.options.getInteger('jours') || 14;
    const guildId = interaction.guildId!;

    const dailyStats = await getDailyStats(days, guildId);

    // Générer le graphique de tendance
    const trendChart = generateTrendChart(dailyStats, type);

    // Calculer des stats supplémentaires
    const values = dailyStats.map(d => type === 'commands' ? d.commands : d.messages);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = values.length > 0 ? Math.round(total / values.length) : 0;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);

    const title = type === 'commands' ? '📊 Tendance des commandes' : '💬 Tendance des messages';
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
                    `**Moyenne:** ${avg}/jour`,
                    `**Maximum:** ${max}`,
                    `**Minimum:** ${min}`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
