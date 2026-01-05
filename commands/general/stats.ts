import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import process from 'node:process';
import version from '../../version.json' assert { type: 'json' };

export const data = new SlashCommandBuilder()
    .setName('botstats')
    .setDescription('Affiche les statistiques du bot');

export async function execute(interaction: CommandInteraction) {
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    // Récupération des informations sur l'utilisation des ressources
    const memoryUsage = process.memoryUsage();
    // Utiliser RSS pour la mémoire utilisée (plus représentative de l'utilisation réelle du processus)
    const memoryUsedMB = Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100;

    // Récupérer la RAM totale de la machine (pas seulement le heap V8)
    let totalMemBytes: number | undefined;
    try {
        // Deno fournit des infos système fiables
        if (typeof Deno !== 'undefined' && typeof Deno.systemMemoryInfo === 'function') {
            const sys = Deno.systemMemoryInfo();
            // total est en octets
            totalMemBytes = sys.total as number;
        }
    } catch (_) {
        // ignore (ex: permission manquante)
    }
    if (!totalMemBytes) {
        try {
            // Fallback Node:os (supporté par Deno en mode compat)
            const os = await import('node:os');
            totalMemBytes = os.totalmem();
        } catch (_) {
            // Dernier recours: utiliser heapTotal (moins précis)
            totalMemBytes = memoryUsage.heapTotal;
        }
    }
    const memoryTotalMB = Math.round(((totalMemBytes ?? 0) / 1024 / 1024) * 100) / 100;
    
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

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
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