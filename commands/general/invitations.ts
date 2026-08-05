import {
    type ActionRowBuilder,
    type ButtonBuilder,
    type ChatInputCommandInteraction,
    ContainerBuilder,
    type InteractionEditReplyOptions,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SlashCommandBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder
} from 'discord.js';
import { KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
    getInviteLeaderboard,
    getInviteMemberStats
} from '../../utils/invites/service.ts';
import {
    attachLeaderboardPagination,
    leaderboardControls,
    LEADERBOARD_PAGE_SIZE
} from '../../utils/leaderboardPagination.ts';

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

function inviteMessage(
    container: ContainerBuilder,
    controls?: ActionRowBuilder<ButtonBuilder>
): InteractionEditReplyOptions {
    return {
        components: controls ? [container, controls] : [container],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] }
    };
}

function requesterFooter(interaction: ChatInputCommandInteraction) {
    const timestamp = Math.floor(Date.now() / 1000);
    return new TextDisplayBuilder().setContent(
        `-# ${interaction.guild!.name} • Demandé par ${interaction.user.username} • <t:${timestamp}:R>`
    );
}

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }
    await interaction.deferReply();
    try {
        await (interaction.client as any).inviteManager?.synchronizeGuild(interaction.guild);
        if (interaction.options.getSubcommand() === 'classement') {
            await showLeaderboard(interaction);
        } else {
            await showMember(interaction);
        }
    } catch (error) {
        console.error('[Invitations] Erreur commande:', error);
        await interaction.editReply(inviteMessage(
            new ContainerBuilder()
                .setAccentColor(KEPLER_COLORS.danger)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(KEPLER_MESSAGES.unexpectedError)
                )
        ));
    }
}

async function showLeaderboard(interaction: ChatInputCommandInteraction) {
    const leaderboard = await getInviteLeaderboard(interaction.guildId!, 25);
    const totalPages = Math.max(1, Math.ceil(leaderboard.length / LEADERBOARD_PAGE_SIZE));
    const medals = ['🥇', '🥈', '🥉'];
    const renderPage = (page: number, disabled = false) => {
        const start = page * LEADERBOARD_PAGE_SIZE;
        const rows = leaderboard.slice(start, start + LEADERBOARD_PAGE_SIZE).map((entry, index) => {
            const position = start + index;
            const marker = medals[position] ?? `**${position + 1}.**`;
            return `${marker} <@${entry.inviter_id}> — **${entry.invite_count}** invitation(s)`;
        });
        const headingContent = new TextDisplayBuilder().setContent(
            `-# KEPLER • INVITATIONS\n## Classement des invitations\n` +
            `${leaderboard.length} inviteur(s) classé(s).`
        );
        const iconUrl = interaction.guild!.iconURL({ forceStatic: true });
        const container = new ContainerBuilder().setAccentColor(KEPLER_COLORS.primary);
        if (iconUrl) {
            container.addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(headingContent)
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl))
            );
        } else {
            container.addTextDisplayComponents(headingContent);
        }
        container
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    rows.join('\n') || 'Aucune invitation active attribuable pour le moment.'
                )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
            .addTextDisplayComponents(requesterFooter(interaction));
        return inviteMessage(
            container,
            totalPages > 1
                ? leaderboardControls('invitations:leaderboard', page, totalPages, disabled)
                : undefined
        );
    };

    const response = await interaction.editReply(renderPage(0));
    attachLeaderboardPagination(
        interaction,
        response,
        'invitations:leaderboard',
        totalPages,
        renderPage
    );
}

async function showMember(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('utilisateur') ?? interaction.user;
    const stats = await getInviteMemberStats(interaction.guildId!, user.id);
    const departures = Math.max(0, stats.tracked_invites - stats.active_members);
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# KEPLER • INVITATIONS\n## Invitations de ${user.username}\n` +
                'Activité attribuée à ce membre sur le serveur.'
            )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ forceStatic: true }))
        );
    const container = new ContainerBuilder()
        .setAccentColor(KEPLER_COLORS.primary)
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Utilisations attribuées** — ${stats.total_invites}\n` +
                `**Arrivées suivies** — ${stats.tracked_invites}\n` +
                `**Toujours présentes** — ${stats.active_members}\n` +
                `**Départs suivis** — ${departures}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(requesterFooter(interaction));
    await interaction.editReply(inviteMessage(container));
}
