import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const SAFE_SUBREDDITS = [
    'wholesomememes',
    'dogmemes',
    'programmerhumor',
    'meirl',
    'antimeme'
];

interface RedditPost {
    data: {
        title: string;
        url: string;
        over_18: boolean;
        post_hint?: string;
        permalink: string;
    };
}

export const data = new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Affiche un meme aléatoire depuis Reddit');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const randomSubreddit = SAFE_SUBREDDITS[Math.floor(Math.random() * SAFE_SUBREDDITS.length)];
    try {
        const response = await fetch(`https://old.reddit.com/r/${randomSubreddit}/hot/.json?limit=50`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KeplerBot/1.0 (Discord Bot; +https://github.com/Antoww/kepler-bot)',
                'Accept': 'application/json',
                'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        
        if (!json.data || !json.data.children) {
            throw new Error('Format de réponse Reddit invalide');
        }

        const posts = json.data.children.filter((post: RedditPost) => 
            !post.data.over_18 && 
            post.data.post_hint === 'image' &&
            (post.data.url.endsWith('.jpg') || post.data.url.endsWith('.png') || post.data.url.endsWith('.gif'))
        );

        if (posts.length === 0) {
            await interaction.editReply("Je n'ai pas trouvé de meme approprié pour le moment. Réessayez !");
            return;
        }

        const randomPost = posts[Math.floor(Math.random() * posts.length)].data;

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#FF6B6B')
            .setTitle(`😂 ${randomPost.title}`)
            .setURL(`https://reddit.com${randomPost.permalink}`)
            .setImage(randomPost.url)
            .setFooter({
                text: `Demandé par ${interaction.user.username} • Depuis r/${randomSubreddit}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération du meme:', error);
        await interaction.editReply("Une erreur s'est produite lors de la récupération du meme. Réessayez plus tard !");
    }
} 