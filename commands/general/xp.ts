import {
    ContainerBuilder,
    MessageFlags,
    SeparatorBuilder,
    SectionBuilder,
    type ChatInputCommandInteraction,
    SlashCommandBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder
} from 'discord.js';
import {
    getXpLeaderboard,
    getXpProfile,
    getXpRank,
    progressBar,
    xpProgress
} from '../../utils/xp/system.ts';
import {
    KEPLER_COLORS,
    KEPLER_MESSAGES,
} from '../../utils/theme.ts';

function xpMessage(container: ContainerBuilder) {
    return {
        components: [container],
        flags: MessageFlags.IsComponentsV2 as MessageFlags.IsComponentsV2
    };
}

function xpContainer(tone: keyof typeof KEPLER_COLORS = 'primary') {
    return new ContainerBuilder().setAccentColor(KEPLER_COLORS[tone]);
}

function requesterFooter(interaction: ChatInputCommandInteraction) {
    const timestamp = Math.floor(Date.now() / 1000);
    return new TextDisplayBuilder().setContent(
        `-# Demandé par ${interaction.user.username} • <t:${timestamp}:R>`
    );
}

export const data = new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Consulte la progression XP de ce serveur')
    .addSubcommand(subcommand => subcommand
        .setName('profil')
        .setDescription('Affiche un profil XP')
        .addUserOption(option => option
            .setName('membre')
            .setDescription('Membre à consulter')))
    .addSubcommand(subcommand => subcommand
        .setName('classement')
        .setDescription('Affiche le classement XP du serveur'));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }

    await interaction.deferReply();
    try {
        if (interaction.options.getSubcommand() === 'classement') {
            await showLeaderboard(interaction);
        } else {
            await showProfile(interaction);
        }
    } catch (error) {
        console.error('[XP] Erreur commande:', error);
        await interaction.editReply(xpMessage(
            xpContainer('danger').addTextDisplayComponents(
                new TextDisplayBuilder().setContent(KEPLER_MESSAGES.unexpectedError)
            )
        ));
    }
}

async function showProfile(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('membre') ?? interaction.user;
    const profile = await getXpProfile(interaction.guildId!, user.id);

    if (!profile) {
        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# KEPLER • PROGRESSION XP\n## Profil de ${user.username}\n` +
                    'Ce membre n’a pas encore gagné d’XP sur ce serveur.'
                )
            )
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(user.displayAvatarURL({ forceStatic: true }))
            );
        await interaction.editReply(xpMessage(
            xpContainer('neutral')
                .addSectionComponents(section)
                .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
                .addTextDisplayComponents(requesterFooter(interaction))
        ));
        return;
    }

    const progress = xpProgress(profile.xp);
    const rank = await getXpRank(interaction.guildId!, profile.xp);
    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# KEPLER • PROGRESSION XP\n## Progression de ${user.username}\n` +
                `**Niveau ${progress.level}**  •  Rang **#${rank}**`
            )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(user.displayAvatarURL({ forceStatic: true }))
        );
    const bar = progressBar(progress.percentage, 10);
    const container = xpContainer('primary')
        .addSectionComponents(section)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### Niveau ${progress.level} → ${progress.level + 1}\n` +
                `\`${bar}\` **${progress.percentage}%**\n` +
                `${progress.current.toLocaleString('fr-FR')} / ${progress.required.toLocaleString('fr-FR')} XP`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**XP total**\n${profile.xp.toLocaleString('fr-FR')}\n\n` +
                `**Messages récompensés**\n${profile.message_count.toLocaleString('fr-FR')}`
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
            requesterFooter(interaction)
        );
    await interaction.editReply(xpMessage(container));
}

async function showLeaderboard(interaction: ChatInputCommandInteraction) {
    const profiles = await getXpLeaderboard(interaction.guildId!, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const rows = profiles.map((profile, index) => {
        const marker = medals[index] ?? `**${index + 1}.**`;
        return `${marker} <@${profile.user_id}> — niveau **${profile.level}** · ${profile.xp.toLocaleString('fr-FR')} XP`;
    });

    const heading = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# KEPLER • CLASSEMENT XP\n## ${interaction.guild!.name}\n` +
                'Les dix membres ayant accumulé le plus d’expérience.'
            )
        );
    const iconUrl = interaction.guild!.iconURL({ forceStatic: true });
    if (iconUrl) heading.setThumbnailAccessory(new ThumbnailBuilder().setURL(iconUrl));
    const container = xpContainer('primary')
        .addSectionComponents(heading)
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(rows.join('\n') || KEPLER_MESSAGES.noData)
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
        .addTextDisplayComponents(
            requesterFooter(interaction)
        );
    await interaction.editReply(xpMessage(container));
}
