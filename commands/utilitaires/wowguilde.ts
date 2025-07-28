import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

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

interface GuildData {
    name: string;
    realm: string;
    raid_progression: Record<string, RaidProgression>;
    raid_rankings: Record<string, RaidRanking>;
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

export async function execute(interaction: CommandInteraction) {
    const server = interaction.options.getString('serveur')!;
    const guild = interaction.options.getString('guilde')!;

    try {
        const region = interaction.options.getString('region') || 'eu';
        const encodedGuild = encodeURIComponent(guild);
        const encodedServer = encodeURIComponent(server);
        
        // Récupérer les informations de la guilde via Raider.IO
        const response = await fetch(`https://raider.io/api/v1/guilds/profile?region=${region}&realm=${encodedServer}&name=${encodedGuild}&fields=raid_progression,raid_rankings`);
        
        if (!response.ok) {
            throw new Error('Guilde non trouvée');
        }
        
        const data = await response.json() as GuildData;
        
        // Récupérer la progression du dernier raid
        const raids = Object.entries(data.raid_progression);
        const lastRaid = raids.length > 0 ? raids[raids.length - 1] : null;
        const raidProgress = lastRaid 
            ? `${lastRaid[0]}: ${lastRaid[1].summary}` 
            : 'Aucune progression';
        
        // Récupérer le classement du dernier raid
        const raidRankings = data.raid_rankings ? Object.entries(data.raid_rankings) : [];
        const lastRanking = raidRankings.length > 0 ? raidRankings[raidRankings.length - 1][1] : null;
        const ranking = lastRanking 
            ? `World: ${lastRanking.mythic.world || 'N/A'} - Realm: ${lastRanking.mythic.realm || 'N/A'}` 
            : 'Non classé';
        
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#FFD700')
            .setTitle(`🏰 Guilde: ${data.name}`)
            .setDescription(`Informations sur la guilde **${data.name}** du serveur **${data.realm}**`)
            .addFields(
                { name: '🌍 Serveur', value: `${data.realm} (${region.toUpperCase()})`, inline: true },
                { name: '⚔️ Progression', value: raidProgress, inline: true },
                { name: '🏆 Classement', value: ranking, inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération des informations de guilde:', error);
        await interaction.reply('Erreur lors de la récupération des informations de guilde. Veuillez réessayer.');
    }
} 