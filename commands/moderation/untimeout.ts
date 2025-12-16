import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Retirer le timeout d\'un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur dont on retire le timeout')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison du retrait du timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target) {
        await interaction.reply('Utilisateur invalide.');
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
        await interaction.reply('❌ Cet utilisateur n\'est pas en timeout.');
        return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas retirer le timeout de cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    if (!targetMember.moderatable) {
        await interaction.reply('❌ Je ne peux pas retirer le timeout de cet utilisateur (permissions insuffisantes).');
        return;
    }

    try {
        // Retirer le timeout (en passant null)
        await targetMember.timeout(null, `${reason} - Par ${interaction.user.tag}`);

        // Essayer d'envoyer un MP à l'utilisateur
        let dmSent = false;
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Votre timeout a été retiré')
                .setDescription(`Votre timeout sur le serveur **${interaction.guild.name}** a été retiré`)
                .addFields(
                    { name: '📝 Raison', value: reason, inline: false },
                    { name: '🛡️ Modérateur', value: interaction.user.tag, inline: false }
                )
                .setFooter({ text: 'Vous pouvez à nouveau envoyer des messages, réagir et parler en vocal.' })
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] });
            dmSent = true;
        } catch (dmError) {
            console.log(`Impossible d'envoyer un MP à ${target.tag} (${target.id}):`, dmError);
            // Ne pas faire échouer l'action si le MP ne peut pas être envoyé
        }

        // Ajouter à l'historique de modération
        await addModerationHistory(interaction.guild.id, target.id, interaction.user.id, 'untimeout', reason);

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Timeout retiré')
            .addFields(
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '💬 Message privé', value: dmSent ? '✅ Envoyé' : '❌ Non envoyé', inline: true }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Untimeout', target, interaction.user, reason);

    } catch (error) {
        console.error('Erreur lors du retrait du timeout:', error);
        await interaction.reply('❌ Une erreur est survenue lors du retrait du timeout.');
    }
}
