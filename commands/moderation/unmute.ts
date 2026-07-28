import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Annuler le mute d\'un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à démuter')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison de l\'annulation du mute')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
        await interaction.reply(KEPLER_MESSAGES.invalidUser);
        return;
    }

    // Vérifications de sécurité
    const member = interaction.member as GuildMember;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (!targetMember) {
        await interaction.reply('❌ Cet utilisateur n\'est pas sur le serveur.');
        return;
    }

    if (!targetMember.isCommunicationDisabled()) {
        await interaction.reply('❌ Cet utilisateur n\'est pas rendu muet.');
        return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas démuter cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    if (!targetMember.moderatable) {
        await interaction.reply('❌ Je ne peux pas démuter cet utilisateur (permissions insuffisantes).');
        return;
    }

    try {
        // Annuler le mute
        await targetMember.timeout(null, `${reason} - Par ${interaction.user.tag}`);

        // Ajouter à l'historique de modération
        await addModerationHistory(interaction.guild.id, target.id, interaction.user.id, 'unmute', reason);

        // Créer l'embed de confirmation
        const embed = createKeplerEmbed()
            .setColor(KEPLER_COLORS.success)
            .setTitle('🔊 Utilisateur démuté')
            .addFields(
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Unmute', target, interaction.user, reason);

    } catch (error) {
        console.error('Erreur lors du démute:', error);
        await interaction.reply('❌ Une erreur est survenue lors du démute.');
    }
}
