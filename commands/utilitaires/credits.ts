import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('credits')
    .setDescription('Affiche les crédits du bot');

export async function execute(interaction: CommandInteraction) {
    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#0099ff')
        .setTitle('👨‍💻 Crédits du Bot')
        .setDescription('Informations sur le développement de ce bot Discord')
        .addFields(
            { name: '🛠️ Développeur', value: 'Tonin', inline: true },
            { name: '📅 Version', value: '1.0.0', inline: true },
            { name: '🔧 Technologie', value: 'Discord.js + Deno', inline: true },
            { name: '📚 Base de données', value: 'Supabase', inline: true },
            { name: '🌐 Langue', value: 'Français', inline: true },
            { name: '📝 Licence', value: 'MIT', inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 