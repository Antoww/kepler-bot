import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';

async function searchLyrics(artist: string, title: string) {
    // API gratuite : lyrics.ovh
    const response = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    
    if (!response.ok) {
        return null;
    }
    
    const data = await response.json();
    return data.lyrics;
}

export const data = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Affiche les paroles d\'une chanson')
    .addStringOption(option =>
        option
            .setName('artiste')
            .setDescription('Nom de l\'artiste')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('titre')
            .setDescription('Titre de la chanson')
            .setRequired(true)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const artiste = interaction.options.getString('artiste', true);
    const titre = interaction.options.getString('titre', true);
    
    await interaction.deferReply();

    try {
        const lyrics = await searchLyrics(artiste, titre);
        
        if (!lyrics) {
            return interaction.editReply(`Paroles non trouvées pour "${titre}" de ${artiste}.`);
        }

        // Découper les paroles si trop longues
        const maxLength = 4096;
        const truncatedLyrics = lyrics.length > maxLength 
            ? lyrics.substring(0, maxLength - 50) + '\n\n...\n[Paroles tronquées]'
            : lyrics;

        const embed = new EmbedBuilder()
            .setColor('#FF1744')
            .setTitle(`${titre} - ${artiste}`)
            .setDescription(truncatedLyrics)
            .setFooter({
            text: 'Demandé par ' + interaction.user.username + ' • Source: lyrics.ovh',
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération des paroles:', error);
        await interaction.editReply('Une erreur est survenue lors de la recherche des paroles.');
    }
}