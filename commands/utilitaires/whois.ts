import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Affiche des informations détaillées sur un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur dont vous voulez voir les informations')
        .setRequired(false));

export async function execute(interaction: CommandInteraction) {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id);

    if (!member) {
        await interaction.reply('Impossible de trouver cet utilisateur sur ce serveur.');
        return;
    }

    const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild!.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString())
        .join(', ');

    const permissions = member.permissions.toArray().join(', ');

    const embed = new EmbedBuilder()
        .setAuthor({ 
            name: interaction.client.user?.username, 
            iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
        })
        .setColor(member.displayHexColor || '#0099ff')
        .setTitle(`Informations détaillées sur ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ forceStatic: false }))
        .addFields(
            { name: '👤 Informations de base', value: `**Nom:** ${targetUser.username}\n**ID:** ${targetUser.id}\n**Surnom:** ${member.nickname || 'Aucun'}\n**Compte créé:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>\n**A rejoint:** <t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: false },
            { name: '🎭 Rôles', value: roles || 'Aucun rôle', inline: false },
            { name: '🔑 Permissions', value: permissions || 'Aucune permission spéciale', inline: false }
        )
        .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
} 