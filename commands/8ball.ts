import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const reponses = [
    "Oui.",
    "Non.",
    "Peut-être.",
    "Certainement !",
    "Je ne pense pas...",
    "C'est possible.",
    "Redemande plus tard.",
    "Je ne peux pas répondre maintenant.",
    "Sans aucun doute !",
    "Très improbable.",
    "Absolument !",
    "Je ne sais pas.",
    "Probablement.",
    "Je doute fort...",
    "Oui, bien sûr !"
];

export const data = new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Pose une question à la boule magique !')
    .addStringOption(option =>
        option.setName('question')
            .setDescription('Ta question pour la 8ball')
            .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    const question = interaction.options.get('question')?.value as string;
    const reponse = reponses[Math.floor(Math.random() * reponses.length)];

    const embed = new EmbedBuilder()
        .setTitle('🎱 8ball')
        .setDescription(`**Question :** ${question}\n**Réponse :** ${reponse}`)
        .setColor('#8e44ad')
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}
