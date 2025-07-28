import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Affiche un meme aléatoire');

export async function execute(interaction: CommandInteraction) {
    const memes = [
        'https://i.imgur.com/example1.jpg',
        'https://i.imgur.com/example2.jpg',
        'https://i.imgur.com/example3.jpg',
        // Ajoutez plus d'URLs de memes ici
    ];

    const randomMeme = memes[Math.floor(Math.random() * memes.length)];

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#FF6B6B')
        .setTitle('😂 Meme du jour')
        .setImage(randomMeme)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 