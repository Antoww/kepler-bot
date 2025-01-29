import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import dayjs from 'dayjs';
import 'https://cdn.skypack.dev/dayjs@1.11.13/locale/fr';
dayjs.locale('fr')

export const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Donne des informations sur un utilisateur.')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('Mentionnez un utilisateur ou entrez une ID utilisateur')
        .setRequired(false));
export async function execute(interaction: CommandInteraction) {

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }

    const user = interaction.options.get('utilisateur')?.user || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const fetchedUser = await user.fetch();
    const bannerURL = fetchedUser.bannerURL({ size: 4096, extension: 'webp' });
    const dateUser = dayjs(interaction.user.createdAt).format('DD/MM/YYYY à HH:mm:ss');
    const joinUser = dayjs(member.joinedAt).format('DD/MM/YYYY à HH:mm:ss');

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('User Info')
        .setThumbnail(user.displayAvatarURL({ forceStatic: false }))
        .addFields(
            { name: 'Nom d\'utilisateur :', value: `${user.username}#${user.discriminator}`, inline: true },
            { name: 'ID :', value: `${user.id}`, inline: true },
            { name: 'Bot :', value: `${user.bot ? 'Oui' : 'Non'}`, inline: true },
            { name: 'Créé le :', value: `${dateUser}`, inline: true },
            { name: 'Rejoint le :', value: `${joinUser}`, inline: true },
            { name: 'Rôles :', value: `${member.roles.cache.map(role => role.name).join(', ')}`, inline: true }
        )
        .setImage(bannerURL ?? null)
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();
    await interaction.reply({ embeds: [embed] });
}