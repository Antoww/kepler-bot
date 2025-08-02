import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('chifoumi')
    .setDescription('Joue au chifoumi (pierre-papier-ciseaux) contre le bot')
    .addStringOption(option =>
        option.setName('choix')
            .setDescription('Votre choix')
            .setRequired(true)
            .addChoices(
                { name: '🪨 Pierre', value: 'pierre' },
                { name: '📄 Papier', value: 'papier' },
                { name: '✂️ Ciseaux', value: 'ciseaux' }
            )
    );

export async function execute(interaction: CommandInteraction) {
    const userChoice = interaction.options.get('choix')?.value as string;
    const choices = ['pierre', 'papier', 'ciseaux'];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    
    const emojis = {
        'pierre': '🪨',
        'papier': '📄',
        'ciseaux': '✂️'
    };

    const choiceNames = {
        'pierre': 'Pierre',
        'papier': 'Papier',
        'ciseaux': 'Ciseaux'
    };

    // Déterminer le résultat
    let result: string;
    let resultEmoji: string;
    let color: number;

    if (userChoice === botChoice) {
        result = 'Égalité !';
        resultEmoji = '🤝';
        color = 0xFFFF00; // Jaune
    } else if (
        (userChoice === 'pierre' && botChoice === 'ciseaux') ||
        (userChoice === 'papier' && botChoice === 'pierre') ||
        (userChoice === 'ciseaux' && botChoice === 'papier')
    ) {
        result = 'Vous avez gagné !';
        resultEmoji = '🎉';
        color = 0x00FF00; // Vert
    } else {
        result = 'Vous avez perdu !';
        resultEmoji = '😢';
        color = 0xFF0000; // Rouge
    }

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor(color)
        .setTitle(`${resultEmoji} ${result}`)
        .setDescription('Résultat du chifoumi')
        .addFields(
            { 
                name: '👤 Votre choix', 
                value: `${emojis[userChoice]} ${choiceNames[userChoice]}`, 
                inline: true 
            },
            { 
                name: '🤖 Choix du bot', 
                value: `${emojis[botChoice]} ${choiceNames[botChoice]}`, 
                inline: true 
            },
            { 
                name: '🏆 Résultat', 
                value: result, 
                inline: true 
            }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
