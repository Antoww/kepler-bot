import {
    type ChatInputCommandInteraction,
    SlashCommandBuilder
} from 'discord.js';
import {
    getXpLeaderboard,
    getXpProfile,
    getXpRank,
    progressBar,
    xpProgress
} from '../../utils/xpSystem.ts';
import {
    createKeplerEmbed,
    KEPLER_MESSAGES,
    setRequesterFooter
} from '../../utils/theme.ts';

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
        await interaction.editReply({ content: KEPLER_MESSAGES.unexpectedError });
    }
}

async function showProfile(interaction: ChatInputCommandInteraction) {
    const user = interaction.options.getUser('membre') ?? interaction.user;
    const profile = await getXpProfile(interaction.guildId!, user.id);

    if (!profile) {
        await interaction.editReply({
            embeds: [
                createKeplerEmbed('neutral')
                    .setTitle(`Profil XP de ${user.username}`)
                    .setDescription('Ce membre n’a pas encore gagné d’XP sur ce serveur.')
                    .setThumbnail(user.displayAvatarURL({ forceStatic: true }))
            ]
        });
        return;
    }

    const progress = xpProgress(profile.xp);
    const rank = await getXpRank(interaction.guildId!, profile.xp);
    const embed = setRequesterFooter(
        createKeplerEmbed('primary')
            .setTitle(`Progression de ${user.username}`)
            .setThumbnail(user.displayAvatarURL({ forceStatic: true }))
            .setDescription(
                `**Niveau ${progress.level}** · Rang **#${rank}**\n` +
                `${progressBar(progress.percentage)} **${progress.percentage}%**`
            )
            .addFields(
                {
                    name: 'Progression',
                    value: `${progress.current.toLocaleString('fr-FR')} / ${progress.required.toLocaleString('fr-FR')} XP`,
                    inline: true
                },
                {
                    name: 'XP total',
                    value: profile.xp.toLocaleString('fr-FR'),
                    inline: true
                },
                {
                    name: 'Messages récompensés',
                    value: profile.message_count.toLocaleString('fr-FR'),
                    inline: true
                }
            ),
        interaction.user
    );
    await interaction.editReply({ embeds: [embed] });
}

async function showLeaderboard(interaction: ChatInputCommandInteraction) {
    const profiles = await getXpLeaderboard(interaction.guildId!, 10);
    const medals = ['🥇', '🥈', '🥉'];
    const rows = profiles.map((profile, index) => {
        const marker = medals[index] ?? `**${index + 1}.**`;
        return `${marker} <@${profile.user_id}> — niveau **${profile.level}** · ${profile.xp.toLocaleString('fr-FR')} XP`;
    });

    const embed = setRequesterFooter(
        createKeplerEmbed('primary')
            .setTitle(`Classement XP · ${interaction.guild!.name}`)
            .setDescription(rows.join('\n') || KEPLER_MESSAGES.noData)
            .setThumbnail(interaction.guild!.iconURL({ forceStatic: true })),
        interaction.user
    );
    await interaction.editReply({ embeds: [embed] });
}
