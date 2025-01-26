import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Donne des informations sur un utilisateur.')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('Mentionnez un utilisateur ou entrez une ID utilisateur')
        .setRequired(false));
export async function execute(interaction: CommandInteraction) {
    const user = interaction.options.get('utilisateur')?.user || interaction.user;

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }
    const member = await interaction.guild.members.fetch(user.id);

    const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('User Info')
        .setThumbnail(user.displayAvatarURL({ forceStatic: false }))
        .addFields(
            { name: 'Nom d\'utilisateur :', value: `${user.username}#${user.discriminator}`, inline: true },
            { name: 'ID :', value: `${user.id}`, inline: true },
            { name: 'Bot :', value: `${user.bot ? 'Oui' : 'Non'}`, inline: true },
            { name: 'Créé le :', value: `${user.createdAt}`, inline: true },
            { name: 'Rejoint le :', value: `${member.joinedAt}`, inline: true },
            { name: 'Rôles :', value: `${member.roles.cache.map(role => role.name).join(', ')}`, inline: true }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}