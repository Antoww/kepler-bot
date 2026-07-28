import { createKeplerEmbed, KEPLER_COLORS, KEPLER_MESSAGES } from '../../utils/theme.ts';
import { type CommandInteraction, SlashCommandBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logModeration } from '../../utils/moderation/logger.ts';
import { addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulser un utilisateur du serveur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à expulser')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison de l\'expulsion')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

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

    if (target.id === interaction.user.id) {
        await interaction.reply('❌ Vous ne pouvez pas vous expulser vous-même.');
        return;
    }

    if (target.id === interaction.client.user?.id) {
        await interaction.reply('❌ Je ne peux pas m\'expulser moi-même.');
        return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas expulser cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    if (!targetMember.kickable) {
        await interaction.reply('❌ Je ne peux pas expulser cet utilisateur (permissions insuffisantes).');
        return;
    }

    try {
        // Expulser l'utilisateur
        await targetMember.kick(`${reason} - Par ${interaction.user.tag}`);

        // Ajouter à l'historique de modération
        const sanctionNumber = await addModerationHistory(interaction.guild.id, target.id, interaction.user.id, 'kick', reason);

        // Créer l'embed de confirmation
        const embed = createKeplerEmbed()
            .setColor(KEPLER_COLORS.warning)
            .setTitle('👢 Utilisateur expulsé')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`},
                { name: '🛡️ Modérateur', value: interaction.user.tag},
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Kick', target, interaction.user, reason, `Sanction #${sanctionNumber}`);

    } catch (error) {
        console.error('Erreur lors de l\'expulsion:', error);
        await interaction.reply('❌ Une erreur est survenue lors de l\'expulsion.');
    }
}
