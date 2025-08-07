import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { WoWAPIClient, GuildData } from '../../utils/wowApiClient.ts';

interface RaidProgression {
    summary: string;
    total_bosses: number;
    normal_bosses_killed: number;
    heroic_bosses_killed: number;
    mythic_bosses_killed: number;
}

interface RaidRanking {
    mythic: {
        world: number;
        region: number;
        realm: number;
    };
}

export const data = new SlashCommandBuilder()
    .setName('wowguilde')
    .setDescription('Affiche les informations d\'une guilde World of Warcraft')
    .addStringOption(option => option.setName('serveur')
        .setDescription('Le nom du serveur')
        .setRequired(true))
    .addStringOption(option => option.setName('guilde')
        .setDescription('Le nom de la guilde')
        .setRequired(true))
    .addStringOption(option => option.setName('region')
        .setDescription('La région du serveur (eu, us, kr, tw)')
        .setRequired(false)
        .addChoices(
            { name: 'Europe', value: 'eu' },
            { name: 'Americas', value: 'us' },
            { name: 'Korea', value: 'kr' },
            { name: 'Taiwan', value: 'tw' }
        ));

export async function execute(interaction: ChatInputCommandInteraction) {
    const server = interaction.options.getString('serveur', true);
    const guild = interaction.options.getString('guilde', true);

    await interaction.deferReply(); // Défère la réponse car les appels API peuvent prendre du temps

    try {
        const region = interaction.options.getString('region') || 'eu';
        console.log(`🎮 [WoWGuilde] Commande exécutée: ${guild} sur ${server} (${region})`);
        
        const apiClient = new WoWAPIClient();
        
        // Récupérer les données via Raider.IO
        const guildData = await apiClient.getGuildData(region, server, guild);
        
        if (!guildData) {
            console.log(`❌ [WoWGuilde] Aucune donnée trouvée pour: ${guild}`);
            throw new Error('Guilde non trouvée');
        }

        console.log(`✅ [WoWGuilde] Données reçues via Raider.IO pour: ${guildData.name}`);
        
        // Analyser les données de progression
        const raids = Object.entries(guildData.raid_progression);
        const currentTier = raids.length > 0 ? raids[raids.length - 1] : null;
        const previousTier = raids.length > 1 ? raids[raids.length - 2] : null;
        
        // Progression actuelle
        const currentProgress = currentTier 
            ? `**${currentTier[0]}**\n${(currentTier[1] as RaidProgression).summary}\n${getProgressBar(currentTier[1] as RaidProgression)}` 
            : 'Aucune progression';
        
        // Progression précédente
        const previousProgress = previousTier 
            ? `**${previousTier[0]}**: ${(previousTier[1] as RaidProgression).summary}` 
            : 'N/A';
        
        // Classements
        const raidRankings = guildData.raid_rankings ? Object.entries(guildData.raid_rankings) : [];
        const lastRanking = raidRankings.length > 0 ? raidRankings[raidRankings.length - 1][1] as RaidRanking : null;
        
        let rankingText = 'Non classé';
        if (lastRanking?.mythic) {
            const parts: string[] = [];
            if (lastRanking.mythic.world) parts.push(`🌍 Monde: **${lastRanking.mythic.world}**`);
            if (lastRanking.mythic.region) parts.push(`🌎 Région: **${lastRanking.mythic.region}**`);
            if (lastRanking.mythic.realm) parts.push(`🏰 Serveur: **${lastRanking.mythic.realm}**`);
            rankingText = parts.join('\n') || 'Non classé';
        }
        
        // Informations sur le serveur et la faction
        const serverInfo = `**${guildData.realm}** (${region.toUpperCase()})`;
        const factionEmoji = guildData.faction.toLowerCase().includes('alliance') ? '🔵' : '🔴';
        const factionInfo = `${factionEmoji} **${guildData.faction}**`;
        
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `Guilde World of Warcraft`, 
                iconURL: 'https://worldofwarcraft.blizzard.com/static/images/warcraft-icon.png'
            })
            .setColor('#FFD700')
            .setTitle(`🏰 ${guildData.name}`)
            .setDescription(`Informations détaillées sur la guilde **${guildData.name}**`)
            .addFields(
                { name: '🌍 Serveur', value: serverInfo, inline: true },
                { name: '⚔️ Faction', value: factionInfo, inline: true },
                { name: '⚔️ Progression Actuelle', value: currentProgress, inline: false },
                { name: '📊 Classement Mythique', value: rankingText, inline: false }
            );

        // Footer avec source de données
        embed.setFooter({
            text: `Source: Raider.IO • Demandé par ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

        // Ajouter progression précédente si disponible
        if (previousProgress !== 'N/A') {
            embed.addFields({ name: '📜 Tier Précédent', value: previousProgress, inline: true });
        }

        // Ajouter un lien vers Raider.IO
        const encodedGuild = encodeURIComponent(guild);
        const encodedServer = encodeURIComponent(server);
        const raiderUrl = `https://raider.io/guilds/${region}/${encodedServer}/${encodedGuild}`;
        embed.addFields({ 
            name: '🔗 Liens', 
            value: `[Voir sur Raider.IO](${raiderUrl})`, 
            inline: true 
        });

        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des informations de guilde:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur')
            .setDescription('Impossible de récupérer les informations de la guilde.')
            .addFields(
                { name: 'Raisons possibles', value: '• Nom de guilde incorrect\n• Nom de serveur incorrect\n• Guilde inexistante\n• API temporairement indisponible' },
                { name: 'Vérifiez', value: '• L\'orthographe exacte du nom\n• Que la guilde existe bien\n• Que le serveur est correct' }
            )
            .setTimestamp();
            
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

// Fonction utilitaire pour créer une barre de progression
function getProgressBar(progression: RaidProgression): string {
    if (!progression.total_bosses) return '';
    
    const mythicPercent = Math.round((progression.mythic_bosses_killed / progression.total_bosses) * 100);
    const heroicPercent = Math.round((progression.heroic_bosses_killed / progression.total_bosses) * 100);
    const normalPercent = Math.round((progression.normal_bosses_killed / progression.total_bosses) * 100);
    
    const bars: string[] = [];
    if (progression.mythic_bosses_killed > 0) {
        bars.push(`🔴 Mythique: ${progression.mythic_bosses_killed}/${progression.total_bosses} (${mythicPercent}%)`);
    }
    if (progression.heroic_bosses_killed > 0) {
        bars.push(`🟠 Héroïque: ${progression.heroic_bosses_killed}/${progression.total_bosses} (${heroicPercent}%)`);
    }
    if (progression.normal_bosses_killed > 0) {
        bars.push(`🟡 Normal: ${progression.normal_bosses_killed}/${progression.total_bosses} (${normalPercent}%)`);
    }
    
    return bars.join('\n') || `0/${progression.total_bosses} boss tués`;
} 