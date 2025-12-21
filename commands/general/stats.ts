import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import process from 'node:process';

export const data = new SlashCommandBuilder()
    .setName('stats')
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
    
    // Calcul approximatif du CPU (basé sur le temps d'utilisation du processus)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000 / uptime / 10) / 100;

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
        .setTitle('📊 Statistiques du Bot')
        .addFields(
            { name: '🏓 Latence', value: `${interaction.client.ws.ping}ms`, inline: true },
            { name: '⏰ Temps de fonctionnement', value: `${days}j ${hours}h ${minutes}m ${seconds}s`, inline: true },
            { name: '🧠 RAM utilisée', value: `${memoryUsedMB}MB / ${memoryTotalMB}MB`, inline: true },
            { name: '💻 CPU', value: `${cpuPercent}%`},
            { name: '🏠 Serveurs', value: interaction.client.guilds.cache.size.toString(), inline: true },
            { name: '👥 Utilisateurs', value: interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toString(), inline: true },
            { name: '📺 Canaux', value: interaction.client.channels.cache.size.toString()},
            { name: '🎭 Rôles', value: interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.roles.cache.size, 0).toString(), inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 