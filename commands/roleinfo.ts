import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import dayjs from 'dayjs';
import 'https://cdn.skypack.dev/dayjs@1.11.13/locale/fr';
dayjs.locale('fr')

export const data = new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Donne des informations sur un rôle.')
    .addRoleOption(option => option.setName('role')
        .setDescription('Mentionnez un rôle ou entrez une ID rôle')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }

    const roleOption = interaction.options.get('role');
    const role = roleOption && roleOption.role ? interaction.guild.roles.cache.get(roleOption.role.id) : null;
    if (!role) {
        interaction.reply('Erreur : Rôle non trouvé.');
        return;
    }
    const dateRole = dayjs(role.createdAt).format('DD/MM/YYYY à HH:mm:ss');
    
    const embed = new EmbedBuilder()
        .setAuthor({ name: interaction.client.user?.username, iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) })
        .setColor('DarkAqua')
        .setTitle('Role Info')
        .setThumbnail(interaction.guild.iconURL({ forceStatic: false }))
        .addFields(
            { name: 'Nom du rôle :', value: `${role.name}`, inline: true },
            { name: 'ID :', value: `${role.id}`, inline: true },
            { name: 'Position :', value: `${role.position}`, inline: true },
            { name: 'Couleur :', value: `${role.color}`, inline: true },
            { name: 'Mentionnable :', value: `${role.mentionable ? 'Oui' : 'Non'}`, inline: true },
            { name: 'Créé le :', value: `${dateRole}`, inline: true },
            { name: 'Nombre de membres :', value: `${role.members.size}`, inline: true },
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();
    await interaction.reply({ embeds: [embed] });

}