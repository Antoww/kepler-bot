import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, PermissionFlagsBits, GuildMember, Role } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { createTempMute, addModerationHistory, getMuteRole } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Rendre muet un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à rendre muet')
        .setRequired(true))
    .addStringOption(option => option.setName('duree')
        .setDescription('Durée du mute (ex: 1d, 2h, 30m)')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison du mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    const duration = interaction.options.getString('duree');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target || !duration) {
        await interaction.reply('Utilisateur ou durée invalide.');
        return;
    }

    // Vérifications de sécurité
    const member = interaction.member as GuildMember;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (!targetMember) {
        await interaction.reply('❌ Cet utilisateur n\'est pas sur le serveur.');
        return;
    }

    if (target.id === interaction.user.id) {
        await interaction.reply('❌ Vous ne pouvez pas vous rendre muet vous-même.');
        return;
    }

    if (target.id === interaction.client.user?.id) {
        await interaction.reply('❌ Je ne peux pas me rendre muet moi-même.');
        return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas rendre muet cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    if (!targetMember.moderatable) {
        await interaction.reply('❌ Je ne peux pas rendre muet cet utilisateur (permissions insuffisantes).');
        return;
    }

    // Parser la durée
    const muteDuration = parseDuration(duration);
    if (!muteDuration) {
        await interaction.reply('❌ Format de durée invalide. Utilisez des formats comme: 1d, 2h, 30m, 1w');
        return;
    }

    try {
        // Vérifier la configuration du rôle de mute
        const muteRoleId = await getMuteRole(interaction.guild.id);
        let useRole = false;
        let muteRole: Role | null = null;

        if (muteRoleId) {
            muteRole = interaction.guild.roles.cache.get(muteRoleId);
            if (muteRole) {
                // Vérifier que le bot peut gérer ce rôle
                const botMember = interaction.guild.members.me;
                if (botMember && muteRole.position < botMember.roles.highest.position) {
                    useRole = true;
                } else {
                    await interaction.reply('❌ Je ne peux pas gérer le rôle de mute configuré. Vérifiez la hiérarchie des rôles ou reconfigurez-le dans `/settings`.');
                    return;
                }
            } else {
                await interaction.reply('❌ Le rôle de mute configuré n\'existe plus. Veuillez le reconfigurer dans `/settings`.');
                return;
            }
        }

        if (useRole && muteRole) {
            // Utiliser le système de rôle
            if (targetMember.roles.cache.has(muteRole.id)) {
                await interaction.reply('❌ Cet utilisateur est déjà muet avec le rôle.');
                return;
            }

            // Ajouter le rôle de mute
            await targetMember.roles.add(muteRole, `${reason} - Par ${interaction.user.tag}`);
        } else {
            // Utiliser le timeout Discord
            if (targetMember.isCommunicationDisabled()) {
                await interaction.reply('❌ Cet utilisateur est déjà en timeout.');
                return;
            }

            // Vérifier la limite de 28 jours pour le timeout Discord
            const maxTimeoutDuration = 28 * 24 * 60 * 60 * 1000; // 28 jours en millisecondes
            if (muteDuration.getTime() - Date.now() > maxTimeoutDuration) {
                await interaction.reply('❌ La durée du timeout ne peut pas dépasser 28 jours. Configurez un rôle de mute dans `/settings` pour des durées plus longues.');
                return;
            }

            // Rendre muet l'utilisateur
            await targetMember.timeout(muteDuration.getTime() - Date.now(), `${reason} - Par ${interaction.user.tag}`);
        }

        // Enregistrer le mute temporaire en base
        await createTempMute(interaction.guild.id, target.id, interaction.user.id, reason, muteDuration);

        // Ajouter à l'historique de modération
        const sanctionNumber = await addModerationHistory(interaction.guild.id, target.id, interaction.user.id, 'mute', reason, duration);

        // Créer l'embed de confirmation
        const embed = createKeplerEmbed()
            .setColor(KEPLER_COLORS.warning)
            .setTitle('🔇 Utilisateur rendu muet')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '⏰ Durée', value: duration, inline: true },
                { name: '🕐 Fin du mute', value: `<t:${Math.floor(muteDuration.getTime() / 1000)}:F>`, inline: true },
                { name: '🔧 Méthode', value: useRole ? `Rôle: ${muteRole!.name}` : 'Timeout Discord', inline: true }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Mute', target, interaction.user, reason, `Sanction #${sanctionNumber} - ${duration}`);

    } catch (error) {
        console.error('Erreur lors du mute:', error);
        await interaction.reply('❌ Une erreur est survenue lors du mute.');
    }
}

function parseDuration(duration: string): Date | null {
    const regex = /^(\d+)([smhdw])$/;
    const match = duration.toLowerCase().match(regex);

    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2];

    const now = new Date();

    switch (unit) {
        case 's': // secondes
            return new Date(now.getTime() + value * 1000);
        case 'm': // minutes
            return new Date(now.getTime() + value * 60 * 1000);
        case 'h': // heures
            return new Date(now.getTime() + value * 60 * 60 * 1000);
        case 'd': // jours
            return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
        case 'w': // semaines
            return new Date(now.getTime() + value * 7 * 24 * 60 * 60 * 1000);
        default:
            return null;
    }
}
