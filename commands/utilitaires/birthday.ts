import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('birthday')
    .setDescription('Souhaite un joyeux anniversaire')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur qui fête son anniversaire')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor('#FF69B4')
        .setTitle('🎉 Joyeux Anniversaire !')
        .setDescription(`**${targetUser.username}** fête son anniversaire aujourd'hui ! 🎂`)
        .addFields(
            { name: '🎁 Souhaits', value: 'Que cette journée soit remplie de joie et de bonheur !', inline: false },
            { name: '🎈 Célébration', value: 'Tous ensemble pour célébrer !', inline: false }
        )
        .setThumbnail(targetUser.displayAvatarURL({ forceStatic: false }))
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 