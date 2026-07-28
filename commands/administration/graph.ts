import { 
    type ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder,
    AttachmentBuilder,
    PermissionFlagsBits
} from 'discord.js';
import {
    getDailyStats,
    getTopCommands,
    getTopUsers,
    getTopChannels,
    getTotalStats
} from '../../utils/statsTracker.ts';
import { renderBarChart, renderLineChart } from '../../utils/statsChart.ts';

export const data = new SlashCommandBuilder()
    .setName('graph')
    .setDescription('📊 Affiche les statistiques du serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
        subcommand
            .setName('vue-ensemble')
            .setDescription('Vue d\'ensemble des statistiques du serveur')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(7)
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
            .setName('activite')
            .setDescription('Statistiques d\'activité (messages et commandes)')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(7)
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
            .setName('membres')
            .setDescription('Évolution et statistiques des membres')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('canaux')
            .setDescription('Canaux les plus actifs')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(7)
                    .setMaxValue(360)
            )
            .addBooleanOption(option =>
                option
                    .setName('depuis_toujours')
                    .setDescription('Analyser tout l\'historique disponible (prioritaire sur jours)')
            )

            .addIntegerOption(option =>
                option
                    .setName('limite')
                    .setDescription('Nombre de canaux à afficher (défaut: 10)')
                    .setMinValue(5)
                    .setMaxValue(15)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('utilisateurs')
            .setDescription('Utilisateurs les plus actifs')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
                    .setMinValue(7)
                    .setMaxValue(360)
            )
            .addBooleanOption(option =>
                option
                    .setName('depuis_toujours')
                    .setDescription('Analyser tout l\'historique disponible (prioritaire sur jours)')
            )

            .addIntegerOption(option =>
                option
                    .setName('limite')
                    .setDescription('Nombre d\'utilisateurs à afficher (défaut: 10)')
                    .setMinValue(5)
                    .setMaxValue(20)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('commandes')
            .setDescription('Commandes les plus utilisées')
            .addIntegerOption(option =>
                option
                    .setName('jours')
                    .setDescription('Nombre de jours à analyser (défaut: 30)')
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
    if (!interaction.guild) {
        return interaction.reply({
            content: '❌ Cette commande ne peut être utilisée qu\'en serveur.',
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
            case 'activite':
                await handleActivity(interaction);
                break;
            case 'membres':
                await handleMembers(interaction);
                break;
            case 'canaux':
                await handleChannels(interaction);
                break;
            case 'utilisateurs':
                await handleUsers(interaction);
                break;
            case 'commandes':
                await handleCommands(interaction);
                break;
            default:
                await interaction.editReply('❌ Sous-commande inconnue.');
        }
    } catch (error) {
        console.error('[Graph Command] Erreur:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la récupération des statistiques.');
    }
}

// ============================================
// Handlers pour les sous-commandes
// ============================================

async function handleOverview(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const guildId = interaction.guildId!;

    const [dailyStats, totalStats, topCommands] = await Promise.all([
        getDailyStats(days, guildId),
        getTotalStats(guildId),
        getTopCommands(days, 5, guildId)
    ]);

    // Stats de la période
    const periodCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const periodMessages = dailyStats.reduce((sum, d) => sum + d.messages, 0);


    const overviewBuffer = await renderLineChart(
        `Activité de ${interaction.guild!.name}`,
        periodLabel,
        dailyStats.map(d => formatChartDate(d.date)),
        [
            { label: 'Messages', color: '#45d7ff', values: dailyStats.map(d => d.messages) },
            { label: 'Commandes', color: '#ff6b6b', values: dailyStats.map(d => d.commands) }
        ]
    );
    const overviewAttachment = new AttachmentBuilder(overviewBuffer, { name: 'server-overview.webp' });

    // Top commandes
    const topCmdList = topCommands
        .map((c, i) => `${i + 1}. \`/${c.command_name}\` (${c.count.toLocaleString()})`)
        .join('\n') || 'Aucune commande utilisée';

    // Stats du serveur
    const guild = interaction.guild!;
    const memberStats = [
        `**Total:** ${guild.memberCount.toLocaleString()} membres`,
        `**Humains:** ${guild.members.cache.filter(m => !m.user.bot).size.toLocaleString()}`,
        `**Bots:** ${guild.members.cache.filter(m => m.user.bot).size.toLocaleString()}`
    ].join('\n');

    const embed = new EmbedBuilder()
        .setColor('#45d7ff')
        .setTitle(`📊 Vue d'ensemble - ${guild.name}`)
        .setThumbnail(guild.iconURL() || null)
        .setDescription(`Statistiques sur **${periodLabel}**`)
        .addFields(
            {
                name: '👥 Membres',
                value: memberStats,
                inline: true
            },
            {
                name: `📨 Activité (${periodLabel})`,
                value: [
                    `**Messages:** ${periodMessages.toLocaleString()}`,
                    `**Commandes:** ${periodCommands.toLocaleString()}`,
                    `**Moy/jour:** ${Math.round(periodMessages / Math.max(dailyStats.length, 1))}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📈 Total historique',
                value: [
                    `**Messages:** ${totalStats.totalMessages.toLocaleString()}`,
                    `**Commandes:** ${totalStats.totalCommands.toLocaleString()}`,
                    `**Jours trackés:** ${totalStats.totalDays}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🏆 Top 5 commandes',
                value: topCmdList,
                inline: false
            }
        )
        .setImage('attachment://server-overview.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [overviewAttachment] });
}

async function handleActivity(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const guildId = interaction.guildId!;

    const dailyStats = await getDailyStats(days, guildId);

    // Calculer les stats
    const totalMessages = dailyStats.reduce((sum, d) => sum + d.messages, 0);
    const totalCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const avgMessages = Math.round(totalMessages / Math.max(dailyStats.length, 1));
    const avgCommands = Math.round(totalCommands / Math.max(dailyStats.length, 1));

    // Jour le plus actif
    const maxDay = dailyStats.length > 0
        ? dailyStats.reduce((max, d) => d.messages > max.messages ? d : max)
        : null;

    const activityBuffer = await renderLineChart(
        'Activité du serveur',
        periodLabel,
        dailyStats.map(d => formatChartDate(d.date)),
        [
            { label: 'Messages', color: '#45d7ff', values: dailyStats.map(d => d.messages) },
            { label: 'Commandes', color: '#ff6b6b', values: dailyStats.map(d => d.commands) }
        ]
    );
    const activityAttachment = new AttachmentBuilder(activityBuffer, { name: 'server-activity.webp' });


    const embed = new EmbedBuilder()
        .setColor('#45d7ff')
        .setTitle(`📈 Activité du serveur`)
        .setDescription(`Période: **${periodLabel}**`)
        .addFields(
            {
                name: '💬 Messages',
                value: [
                    `**Total:** ${totalMessages.toLocaleString()}`,
                    `**Moyenne/jour:** ${avgMessages.toLocaleString()}`,
                    `**Record:** ${maxDay ? `${maxDay.messages} (${new Date(maxDay.date).toLocaleDateString('fr-FR')})` : 'N/A'}`
                ].join('\n'),
                inline: true
            },
            {
                name: '⚡ Commandes',
                value: [
                    `**Total:** ${totalCommands.toLocaleString()}`,
                    `**Moyenne/jour:** ${avgCommands.toLocaleString()}`
                ].join('\n'),
                inline: true
            },
            { name: '\u200b', value: '\u200b', inline: true },
            {
                name: '📊 Tendance des messages',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            }
        )
        .setImage('attachment://server-activity.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [activityAttachment] });
}

async function handleMembers(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild!;

    // Statistiques des membres
    const totalMembers = guild.memberCount;
    const onlineMembers = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = totalMembers - bots;

    // Rôles
    const roles = guild.roles.cache.filter(r => r.id !== guild.id).size;
    const topRole = guild.roles.highest;

    // Boosts
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const membersBuffer = await renderBarChart(
        'Composition des membres',
        guild.name,
        [
            { label: 'Humains', value: humans },
            { label: 'Bots', value: bots },
            { label: 'En ligne', value: onlineMembers }
        ],
        '#9d8cff'
    );
    const membersAttachment = new AttachmentBuilder(membersBuffer, { name: 'server-members.webp' });


    const embed = new EmbedBuilder()
        .setColor('#9d8cff')
        .setTitle(`👥 Statistiques des membres`)
        .setThumbnail(guild.iconURL() || null)
        .addFields(
            {
                name: '📊 Composition',
                value: [
                    `**Total:** ${totalMembers.toLocaleString()} membres`,
                    `**Humains:** ${humans.toLocaleString()}`,
                    `**Bots:** ${bots.toLocaleString()}`,
                    `**En ligne:** ${onlineMembers.toLocaleString()}`
                ].join('\n'),
                inline: true
            },
            {
                name: '🎭 Rôles',
                value: [
                    `**Total:** ${roles} rôles`,
                    `**Plus haut:** ${topRole.name}`
                ].join('\n'),
                inline: true
            },
            {
                name: '💎 Boosts',
                value: [
                    `**Niveau:** ${boostLevel}`,
                    `**Boosts:** ${boostCount}`
                ].join('\n'),
                inline: true
            },
            {
                name: '📅 Informations',
                value: [
                    `**Créé le:** ${guild.createdAt.toLocaleDateString('fr-FR')}`,
                    `**Propriétaire:** <@${guild.ownerId}>`,
                    `**Canaux:** ${guild.channels.cache.size}`
                ].join('\n'),
                inline: false
            }
        )
        .setImage('attachment://server-members.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [membersAttachment] });
}

async function handleChannels(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const limit = interaction.options.getInteger('limite') || 10;
    const guildId = interaction.guildId!;

    const topChannels = await getTopChannels(days, limit, guildId);

    if (topChannels.length === 0) {
        return interaction.editReply('📊 Aucune donnée disponible pour cette période.');
    }

    // Résoudre les noms de canaux et créer le graphique
    const chartData: { label: string; value: number }[] = [];
    
    for (const channelStat of topChannels) {
        const channel = interaction.guild!.channels.cache.get(channelStat.channel_id);
        const name = channel ? `#${channel.name}` : 'Canal supprimé';
        chartData.push({
            label: name.slice(0, 15),
            value: channelStat.message_count
        });
    }

    const channelsBuffer = await renderBarChart('Canaux les plus actifs', periodLabel, chartData, '#ff6b6b');
    const channelsAttachment = new AttachmentBuilder(channelsBuffer, { name: 'server-channels.webp' });

    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('📺 Canaux les plus actifs')
        .setDescription(`Période: **${periodLabel}**`)
        .addFields({
            name: '📊 Classement',
            value: 'Graphique détaillé ci-dessous.',
            inline: false
        })
        .setImage('attachment://server-channels.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [channelsAttachment] });
}

async function handleUsers(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const limit = interaction.options.getInteger('limite') || 10;
    const guildId = interaction.guildId!;

    const topUsers = await getTopUsers(days, limit, guildId);

    if (topUsers.length === 0) {
        return interaction.editReply('📊 Aucune donnée disponible pour cette période.');
    }

    // Résoudre les membres manquants en parallèle pour limiter la latence Discord.
    const resolvedUsers = await Promise.all(topUsers.map(async user => {
        const cachedMember = interaction.guild!.members.cache.get(user.user_id);
        if (cachedMember) return { ...user, username: cachedMember.displayName };
        try {
            const member = await interaction.guild!.members.fetch(user.user_id);
            return { ...user, username: member.displayName };
        } catch {
            return { ...user, username: 'Utilisateur parti' };
        }
    }));

    const userLines = resolvedUsers.map((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        return `${medal} **${user.username}** - ${user.message_count.toLocaleString()} messages`;
    });
    const chartData = resolvedUsers.map(user => ({
        label: user.username.slice(0, 24),
        value: user.message_count
    }));

    const usersBuffer = await renderBarChart('Utilisateurs les plus actifs', periodLabel, chartData, '#ff8a5c');
    const usersAttachment = new AttachmentBuilder(usersBuffer, { name: 'server-users.webp' });

    const embed = new EmbedBuilder()
        .setColor('#ff8a5c')
        .setTitle('👑 Utilisateurs les plus actifs')
        .setDescription(`Période: **${periodLabel}**\n\n${userLines.join('\n')}`)
        .setImage('attachment://server-users.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [usersAttachment] });
}

async function handleCommands(interaction: ChatInputCommandInteraction) {
    const days = resolveStatsDays(interaction, 30);
    const periodLabel = formatStatsPeriod(days);
    const guildId = interaction.guildId!;

    const [topCommands, dailyStats] = await Promise.all([
        getTopCommands(days, 10, guildId),
        getDailyStats(days, guildId)
    ]);

    if (topCommands.length === 0) {
        return interaction.editReply('📊 Aucune commande utilisée durant cette période.');
    }

    // Calculer les stats
    const totalCommands = dailyStats.reduce((sum, d) => sum + d.commands, 0);
    const avgPerDay = Math.round(totalCommands / Math.max(dailyStats.length, 1));

    // Graphique
    const chartData = topCommands.map(c => ({
        label: `/${c.command_name}`,
        value: c.count
    }));
    const commandsBuffer = await renderBarChart('Commandes les plus utilisées', periodLabel, chartData, '#f8c15c');
    const commandsAttachment = new AttachmentBuilder(commandsBuffer, { name: 'server-commands.webp' });


    const embed = new EmbedBuilder()
        .setColor('#f8c15c')
        .setTitle('⚡ Commandes les plus utilisées')
        .setDescription(`Période: **${periodLabel}**`)
        .addFields(
            {
                name: '📊 Résumé',
                value: [
                    `**Total:** ${totalCommands.toLocaleString()} commandes`,
                    `**Moyenne/jour:** ${avgPerDay.toLocaleString()}`
                ].join('\n'),
                inline: false
            },
            {
                name: '🏆 Top 10',
                value: 'Graphique détaillé ci-dessous.',
                inline: false
            }
        )
        .setImage('attachment://server-commands.webp')
        .setFooter({ text: `Demandé par ${interaction.user.username}` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [commandsAttachment] });
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
