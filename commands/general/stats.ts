import { createKeplerEmbed, KEPLER_COLORS } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder } from 'discord.js';
import version from '../../version.json' with { type: 'json' };

export const data = new SlashCommandBuilder()
    .setName('botstats')
    .setDescription('Affiche les statistiques du bot');

export async function execute(interaction: CommandInteraction) {
    // Calculer l'uptime depuis le démarrage du bot
    const startTime = interaction.client.readyTimestamp || Date.now();
    const uptime = (Date.now() - startTime) / 1000;
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    // Récupération des informations sur l'utilisation des ressources
    const memoryUsage = Deno.memoryUsage();
    // Utiliser heapUsed pour la mémoire utilisée
    const memoryUsedMB = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;

    // Récupérer la RAM totale du système
    let memoryTotalMB = 0;
    try {
        const sys = Deno.systemMemoryInfo();
        memoryTotalMB = Math.round((sys.total / 1024 / 1024) * 100) / 100;
    } catch (_) {
        // Si pas d'accès, utiliser heapTotal
        memoryTotalMB = Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100;
    }

    // CPU: Deno ne supporte pas process.cpuUsage(), on utilise une alternative
    let cpuPercent = 0;
    try {
        // Tenter d'utiliser Deno.systemMemoryInfo pour vérifier si on peut accéder aux infos système
        // Le CPU réel nécessiterait des permissions --allow-sys
        if (typeof Deno !== 'undefined' && Deno.loadavg) {
            const loadAvg = Deno.loadavg();
            // loadavg retourne [1min, 5min, 15min] - on prend la moyenne 1min
            cpuPercent = Math.round(loadAvg[0] * 100) / 100;
        }
    } catch {
        // Fallback: estimation basée sur le temps d'uptime (très approximatif)
        cpuPercent = 0; // Indisponible
    }

    // Ping WebSocket - gérer le cas -1 au démarrage
    const wsPing = interaction.client.ws.ping;
    const pingDisplay = wsPing >= 0 ? `${wsPing}ms` : 'N/A';

    const embed = createKeplerEmbed()
        .setAuthor({
            name: interaction.client.user?.username,
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false })
        })
        .setColor(KEPLER_COLORS.primary)
        .setTitle('📊 Statistiques du Bot')
        .addFields(
            { name: '🏓 Latence', value: pingDisplay, inline: true },
            { name: '⏰ Uptime', value: `${days}j ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '💻 CPU', value: `${cpuPercent}%`, inline: true },
            { name: '🧠 RAM', value: `${memoryUsedMB} / ${memoryTotalMB} MB`, inline: true },
            { name: '🏠 Serveurs', value: interaction.client.guilds.cache.size.toString(), inline: true },
            { name: '👥 Utilisateurs', value: interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toString(), inline: true },
            { name: '📺 Canaux', value: interaction.client.channels.cache.size.toString(), inline: true },
            { name: '🎭 Rôles', value: interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.roles.cache.size, 0).toString(), inline: true },
            { name: '📦 Version', value: `v${version.version}`, inline: true }
        )
        .setFooter({
            text: `${version.codename} • Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}