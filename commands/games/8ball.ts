import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Pose une question à la boule magique')
    .addStringOption(option => option.setName('question')
        .setDescription('Votre question')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const question = interaction.options.getString('question')!;
    
    const responses = [
        'C\'est certain.',
        'C\'est décidément ainsi.',
        'Sans aucun doute.',
        'Oui, définitivement.',
        'Vous pouvez compter dessus.',
        'Comme je le vois, oui.',
        'Très probablement.',
        'Les perspectives sont bonnes.',
        'Oui.',
        'Les signes indiquent oui.',
        'Réponse floue, réessayez.',
        'Redemandez plus tard.',
        'Il vaut mieux ne pas vous le dire maintenant.',
        'Impossible de prédire maintenant.',
        'Concentrez-vous et redemandez.',
        'Ne comptez pas dessus.',
        'Ma réponse est non.',
        'Mes sources disent non.',
        'Les perspectives ne sont pas très bonnes.',
        'Très douteux.'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#9B59B6')
        .setTitle('🔮 Boule Magique')
        .addFields(
            { name: '❓ Question', value: question, inline: false },
            { name: '🎱 Réponse', value: randomResponse, inline: false }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 