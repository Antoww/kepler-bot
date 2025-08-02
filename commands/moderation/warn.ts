import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { createWarning, addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Avertir un utilisateur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à avertir')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison de l\'avertissement')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison');

    if (!target || !reason) {
        await interaction.reply('Utilisateur ou raison invalide.');
        return;
    }

    // Vérifications de sécurité
    const member = interaction.member as GuildMember;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (target.id === interaction.user.id) {
        await interaction.reply('❌ Vous ne pouvez pas vous avertir vous-même.');
        return;
    }

    if (target.id === interaction.client.user?.id) {
        await interaction.reply('❌ Je ne peux pas m\'avertir moi-même.');
        return;
    }

    if (targetMember && member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas avertir cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    try {
        // Créer le warning et obtenir le numéro de sanction
        const sanctionNumber = await createWarning(interaction.guild.id, target.id, interaction.user.id, reason);

        // Ajouter à l'historique de modération
        await addModerationHistory(interaction.guild.id, target.id, interaction.user.id, 'warn', reason);

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#ffaa00')
            .setTitle('⚠️ Utilisateur averti')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Envoyer un message privé à l'utilisateur averti
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#ffaa00')
                .setTitle('⚠️ Vous avez reçu un avertissement')
                .addFields(
                    { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                    { name: '🏠 Serveur', value: interaction.guild.name, inline: true },
                    { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                    { name: '📝 Raison', value: reason, inline: false }
                )
                .setFooter({ text: 'Respectez les règles du serveur pour éviter de futures sanctions.' })
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] });
        } catch (error) {
            // Impossible d'envoyer un DM, on continue sans erreur
            console.log(`Impossible d'envoyer un DM à ${target.tag}`);
        }

        // Logger l'action
        await logModeration(interaction.guild, 'Warn', target, interaction.user, reason, `Sanction #${sanctionNumber}`);

    } catch (error) {
        console.error('Erreur lors de la création de l\'avertissement:', error);
        await interaction.reply('❌ Une erreur est survenue lors de la création de l\'avertissement.');
    }
}
