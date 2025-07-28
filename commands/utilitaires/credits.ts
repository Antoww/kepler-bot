import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import config from '../../config.json' with { type: 'json' };

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
            { name: '🛠️ Développeur', value: '[Antow](https://github.com/Antoww)', inline: true },
            { name: '📅 Version', value: `${config.botversion}`, inline: true },
            { name: '🔧 Technologie', value: 'Discord.js + Deno', inline: true },
            { name: '📚 Base de données', value: 'Supabase', inline: true },
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 