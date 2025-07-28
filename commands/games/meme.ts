import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

interface MemeResponse {
    title: string;
    url: string;
    postLink: string;
    subreddit: string;
}
 
export const data = new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Affiche un meme aléatoire');

export async function execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    try {
        const response = await fetch('https://meme-api.com/gimme', {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const meme: MemeResponse = await response.json();

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#FF6B6B')
            .setTitle(`😂 ${meme.title}`)
            .setURL(meme.postLink)
            .setImage(meme.url)
            .setFooter({
                text: `Demandé par ${interaction.user.username} • Depuis r/${meme.subreddit}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération du meme:', error);
        await interaction.editReply("Une erreur s'est produite lors de la récupération du meme. Réessayez plus tard !");
    }
} 