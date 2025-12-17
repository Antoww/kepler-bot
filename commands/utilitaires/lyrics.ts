import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import Genius from 'genius-lyrics';

const client = new Genius(process.env.GENIUS_API_TOKEN || '');

export const data = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Affiche les paroles d\'une chanson')
    .addStringOption(option =>
        option
            .setName('titre')
            .setDescription('Le titre de la chanson')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('artiste')
            .setDescription('Le nom de l\'artiste (optionnel)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const titre = interaction.options.getString('titre', true);
    const artiste = interaction.options.getString('artiste');
    
    await interaction.deferReply();

    try {
        const query = artiste ? `${artiste} ${titre}` : titre;
        const searches = await client.songs.search(query);
        
        if (searches.length === 0) {
            return interaction.editReply('Aucune chanson trouvée.');
        }

        const song = searches[0];
        const lyrics = await song.lyrics();

        if (!lyrics) {
            return interaction.editReply('Paroles non disponibles pour cette chanson.');
        }

        // Découper les paroles si trop longues
        const maxLength = 4096;
        const truncatedLyrics = lyrics.length > maxLength 
            ? lyrics.substring(0, maxLength - 50) + '\n\n...\n[Paroles tronquées]'
            : lyrics;

        const embed = new EmbedBuilder()
            .setColor('#FF1744')
            .setTitle(`${song.title} - ${song.artist.name}`)
            .setDescription(truncatedLyrics)
            .setThumbnail(song.thumbnail)
            .setURL(song.url)
            .setFooter({ text: 'Source: Genius' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération des paroles:', error);
        await interaction.editReply('Une erreur est survenue lors de la recherche des paroles.');
    }
}