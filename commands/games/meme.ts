import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

const SAFE_SUBREDDITS = [
    'wholesomememes',
    'memes',
    'dankmemes',
    'funny'
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
        const response = await fetch(`https://www.reddit.com/r/${randomSubreddit}/hot.json?limit=50`);
        const json = await response.json();
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