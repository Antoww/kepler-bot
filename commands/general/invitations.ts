import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder
} from 'discord.js';
import { createKeplerEmbed, KEPLER_MESSAGES, setRequesterFooter } from '../../utils/theme.ts';
import {
    getInviteLeaderboard,
    getInviteMemberStats
} from '../../utils/invites/service.ts';

export const data = new SlashCommandBuilder()
    .setName('invitations')
    .setDescription('Consulte les invitations suivies sur ce serveur')
    .addSubcommand(subcommand =>
        subcommand
            .setName('classement')
            .setDescription('Affiche les meilleurs inviteurs du serveur'))
    .addSubcommand(subcommand =>
        subcommand
            .setName('membre')
            .setDescription('Affiche les invitations d’un membre')
            .addUserOption(option =>
                option
                    .setName('utilisateur')
                    .setDescription('Membre à consulter')
                    .setRequired(false)));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }
    await interaction.deferReply();

    if (interaction.options.getSubcommand() === 'classement') {
        const leaderboard = await getInviteLeaderboard(interaction.guild.id);
        const description = leaderboard.length
            ? leaderboard.map((entry, index) =>
                `**${index + 1}.** <@${entry.inviter_id}> — **${entry.invite_count}** arrivée(s)`
            ).join('\n')
            : 'Aucune invitation attribuée pour le moment.';
        const embed = setRequesterFooter(
            createKeplerEmbed('primary')
                .setTitle('Classement des invitations')
                .setDescription(description),
            interaction.user,
            interaction.guild.name
        );
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const user = interaction.options.getUser('utilisateur') ?? interaction.user;
    const stats = await getInviteMemberStats(interaction.guild.id, user.id);
    const embed = setRequesterFooter(
        createKeplerEmbed('primary')
            .setTitle(`Invitations de ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ forceStatic: false }))
            .addFields(
                { name: 'Arrivées attribuées', value: String(stats.total_invites), inline: true },
                { name: 'Toujours présentes', value: String(stats.active_members), inline: true },
                { name: 'Départs', value: String(stats.total_invites - stats.active_members), inline: true }
            ),
        interaction.user,
        interaction.guild.name
    );
    await interaction.editReply({ embeds: [embed] });
}
