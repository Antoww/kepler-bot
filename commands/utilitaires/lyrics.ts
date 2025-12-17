import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';

async function searchSong(query: string) {
    const token = Deno.env.get('GENIUS_API_TOKEN');
    
    if (!token) {
        throw new Error('GENIUS_API_TOKEN environment variable is not set');
    }

    console.log(`[DEBUG] Token length: ${token.length}, starts with: ${token.substring(0, 10)}...`);

    const response = await fetch(`https://api.genius.com/search?q=${encodeURIComponent(query)}`, {
        headers: {
            'Authorization': `Bearer ${token.trim()}`
        }
    });

    console.log(`[DEBUG] Response status: ${response.status}`);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] Error response: ${errorText}`);
        throw new Error(`API Genius erreur ${response.status}: Vérifiez que le token est un "Client Access Token" valide`);
    }

    const data = await response.json();
    console.log('[DEBUG] API Response:', JSON.stringify(data, null, 2));
    
    if (!data || !data.response || !data.response.hits) {
        throw new Error('Format de réponse API invalide');
    }
    
    return data.response.hits;
}

async function getLyrics(url: string): Promise<string> {
    const response = await fetch(url);
    const html = await response.text();
    
    // Extraire les paroles du HTML (simplifié)
    const lyricsMatch = html.match(/<div[^>]*data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g);
    
    if (!lyricsMatch) {
        return '';
    }

    let lyrics = lyricsMatch
        .map(div => div.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))
        .join('\n\n')
        .trim();

    return lyrics;
}

export const data = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Affiche les paroles d\'une chanson')
    .addStringOption(option =>
        option
            .setName('titre')
            .setDescription('Titre de la chanson')
            .setRequired(true)
    )
    .addStringOption(option =>
        option
            .setName('artiste')
            .setDescription('Nom de l\'artiste (optionnel)')
            .setRequired(false)
    );

export async function execute(interaction: ChatInputCommandInteraction) {
    const titre = interaction.options.getString('titre', true);
    const artiste = interaction.options.getString('artiste');
    
    await interaction.deferReply();

    try {
        const query = artiste ? `${artiste} ${titre}` : titre;
        const hits = await searchSong(query);
        
        if (hits.length === 0) {
            return interaction.editReply('Aucune chanson trouvée.');
        }

        const song = hits[0].result;
        const lyrics = await getLyrics(song.url);

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
            .setTitle(`${song.title} - ${song.primary_artist.name}`)
            .setDescription(truncatedLyrics)
            .setThumbnail(song.song_art_image_thumbnail_url)
            .setURL(song.url)
            .setFooter({ text: 'Source: Genius' });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération des paroles:', error);
        await interaction.editReply('Une erreur est survenue lors de la recherche des paroles.');
    }
}