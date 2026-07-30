import {
    type ChatInputCommandInteraction,
    PermissionFlagsBits,
    SlashCommandBuilder
} from 'discord.js';
import {
    removeXpRewardRoles,
    resetXpProfile
} from '../../utils/xp/system.ts';
import {
    createKeplerEmbed,
    KEPLER_MESSAGES,
    setRequesterFooter
} from '../../utils/theme.ts';
import { logger } from '../../utils/logger.ts';
import { sendXpLog } from '../../utils/xp/logger.ts';

export const data = new SlashCommandBuilder()
    .setName('xpadmin')
    .setDescription('Administre les profils XP de ce serveur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName('reset')
        .setDescription('Réinitialise le profil XP d’un utilisateur sur ce serveur')
        .addStringOption(option => option
            .setName('utilisateur')
            .setDescription('Mention ou identifiant Discord, même si le membre a quitté')
            .setMinLength(17)
            .setMaxLength(23)
            .setRequired(true)));

export async function execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({ content: KEPLER_MESSAGES.administratorOnly, ephemeral: true });
        return;
    }

    const input = interaction.options.getString('utilisateur', true).trim();
    const userId = parseUserId(input);
    if (!userId) {
        await interaction.reply({
            content: '❌ Indiquez une mention valide ou un identifiant Discord numérique.',
            ephemeral: true
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });
    try {
        const existed = await resetXpProfile(interaction.guild.id, userId);
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        let removedRoles: string[] = [];
        let roleWarning = false;

        if (member) {
            try {
                removedRoles = await removeXpRewardRoles(member);
            } catch (error) {
                roleWarning = true;
                logger.warn(`Rôles XP non retirés pendant le reset de ${userId}`, error, 'XP');
            }
        }

        const details = [
            existed
                ? `Le profil XP de <@${userId}> a été remis à zéro sur **${interaction.guild.name}**.`
                : `Aucun profil XP n’existait pour <@${userId}> sur ce serveur.`,
            removedRoles.length
                ? `${removedRoles.length} rôle(s) de récompense retiré(s).`
                : member
                    ? 'Aucun rôle de récompense XP à retirer.'
                    : 'Le membre a quitté le serveur : aucune modification de rôle nécessaire.',
            roleWarning ? '⚠️ Certains rôles n’ont pas pu être retirés. Vérifiez la hiérarchie du bot.' : ''
        ].filter(Boolean).join('\n');

        const embed = setRequesterFooter(
            createKeplerEmbed(existed ? 'success' : 'neutral')
                .setTitle(existed ? 'Profil XP réinitialisé' : 'Profil XP introuvable')
                .setDescription(details),
            interaction.user
        );
        await interaction.editReply({ embeds: [embed], allowedMentions: { parse: [] } });
        await sendXpLog(
            interaction.guild,
            'Profil XP réinitialisé',
            existed
                ? `<@${userId}> a été remis à zéro par <@${interaction.user.id}>.`
                : `<@${interaction.user.id}> a demandé le reset de <@${userId}>, mais aucun profil n’existait.`,
            existed ? 'warning' : 'neutral',
            [{
                name: 'Rôles retirés',
                value: removedRoles.length ? removedRoles.map(id => `<@&${id}>`).join(', ') : 'Aucun',
                inline: false
            }]
        );
    } catch (error) {
        logger.error(`Erreur reset XP de ${userId}`, error, 'XP');
        await interaction.editReply({ content: KEPLER_MESSAGES.unexpectedError });
    }
}

function parseUserId(value: string): string | null {
    const mention = value.match(/^<@!?(\d{17,20})>$/);
    if (mention) return mention[1];
    return /^\d{17,20}$/.test(value) ? value : null;
}
