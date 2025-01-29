import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('rolelist')
    .setDescription('Liste les rôles du serveur.');

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Erreur : Impossible de récupérer les informations du serveur.');
        return;
    }

    const roles = interaction.guild.roles.cache
        .filter(role => role.name !== '@everyone')
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString());

    const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('Liste des rôles')
        .setThumbnail(interaction.guild.iconURL({ forceStatic: false }))
        .addFields(
            //{ name: 'Rôles :', value: roles.join(', '), inline: true },
            { name: 'Rôles affichés :', value: roles.length > 25 ? '25 premiers rôles' : roles.join(` \n`) },
            { name: 'Nombre de rôles :', value: roles.length.toString(), inline: true },
        )
        
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply(( {embeds: [embed]} ));
}