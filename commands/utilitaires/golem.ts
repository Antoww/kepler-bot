import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('golem')
    .setDescription('Crée un golem virtuel');

export async function execute(interaction: CommandInteraction) {
    const golemTypes = ['Pierre', 'Fer', 'Or', 'Diamant', 'Émeraude'];
    const randomType = golemTypes[Math.floor(Math.random() * golemTypes.length)];
    
    const golemEmojis = {
        'Pierre': '🪨',
        'Fer': '⚙️',
        'Or': '🥇',
        'Diamant': '💎',
        'Émeraude': '💚'
    };

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#8B4513')
        .setTitle(`${golemEmojis[randomType as keyof typeof golemEmojis]} Golem ${randomType} créé !`)
        .setDescription(`Un golem de ${randomType} a été créé avec succès !`)
        .addFields(
            { name: '🛡️ Type', value: randomType, inline: true },
            { name: '💪 Force', value: '100/100', inline: true },
            { name: '🛠️ Statut', value: 'Actif', inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 