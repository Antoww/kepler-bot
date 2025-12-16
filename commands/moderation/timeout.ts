import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Placer un utilisateur en timeout (exclure temporairement)')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à placer en timeout')
        .setRequired(true))
    .addStringOption(option => option.setName('duree')
        .setDescription('Durée du timeout (ex: 1d, 12h, 30m) - Max 28 jours')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison du timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    // Différer la réponse pour éviter le timeout de l'interaction
    await interaction.deferReply();

    const target = interaction.options.getUser('utilisateur');
    const duration = interaction.options.getString('duree');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';

    if (!target || !duration) {
        await interaction.editReply('Utilisateur ou durée invalide.');
        return;
    }

    // Vérifications de sécurité
    const member = interaction.member as GuildMember;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (!targetMember) {
        await interaction.editReply('❌ Cet utilisateur n\'est pas sur le serveur.');
        return;
    }

    if (target.id === interaction.user.id) {
        await interaction.editReply('❌ Vous ne pouvez pas vous placer en timeout vous-même.');
        return;
    }

    if (target.id === interaction.client.user?.id) {
        await interaction.editReply('❌ Je ne peux pas me placer en timeout moi-même.');
        return;
    }

    if (member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.editReply('❌ Vous ne pouvez pas placer en timeout cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    if (!targetMember.moderatable) {
        await interaction.editReply('❌ Je ne peux pas placer en timeout cet utilisateur (permissions insuffisantes).');
        return;
    }

    // Parser la durée
    const timeoutDuration = parseDuration(duration);
    if (!timeoutDuration) {
        await interaction.editReply('❌ Format de durée invalide. Utilisez des formats comme: 1d, 12h, 30m, 1w');
        return;
    }

    // Vérifier la limite de 28 jours pour le timeout Discord
    const maxTimeoutDuration = 28 * 24 * 60 * 60 * 1000; // 28 jours en millisecondes
    const timeoutMs = timeoutDuration.getTime() - Date.now();

    if (timeoutMs > maxTimeoutDuration) {
        await interaction.editReply('❌ La durée du timeout ne peut pas dépasser 28 jours (limite Discord).');
        return;
    }

    if (timeoutMs < 1000) {
        await interaction.editReply('❌ La durée du timeout doit être d\'au moins 1 seconde.');
        return;
    }

    try {
        // Vérifier si l'utilisateur est déjà en timeout
        if (targetMember.isCommunicationDisabled()) {
            await interaction.editReply('❌ Cet utilisateur est déjà en timeout.');
            return;
        }

        // Placer l'utilisateur en timeout
        await targetMember.timeout(timeoutMs, `${reason} - Par ${interaction.user.tag}`);

        // Essayer d'envoyer un MP à l'utilisateur
        let dmSent = false;
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⏱️ Vous avez été placé en timeout')
                .setDescription(`Vous avez été placé en timeout sur le serveur **${interaction.guild.name}**`)
                .addFields(
                    { name: '📝 Raison', value: reason, inline: false },
                    { name: '⏰ Durée', value: duration, inline: true },
                    { name: '🕐 Fin du timeout', value: `<t:${Math.floor(timeoutDuration.getTime() / 1000)}:F>`, inline: true },
                    { name: '🛡️ Modérateur', value: interaction.user.tag, inline: false }
                )
                .setFooter({ text: 'Vous ne pourrez pas envoyer de messages, réagir ou parler en vocal pendant cette durée.' })
                .setTimestamp();

            await target.send({ embeds: [dmEmbed] });
            dmSent = true;
        } catch (dmError) {
            console.log(`Impossible d'envoyer un MP à ${target.tag} (${target.id}):`, dmError);
            // Ne pas faire échouer le timeout si le MP ne peut pas être envoyé
        }

        // Ajouter à l'historique de modération
        const sanctionNumber = await addModerationHistory(
            interaction.guild.id, 
            target.id, 
            interaction.user.id, 
            'timeout', 
            reason, 
            duration
        );

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('⏱️ Utilisateur placé en timeout')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '⏰ Durée', value: duration, inline: true },
                { name: '🕐 Fin du timeout', value: `<t:${Math.floor(timeoutDuration.getTime() / 1000)}:F>`, inline: true },
                { name: '💬 Message privé', value: dmSent ? '✅ Envoyé' : '❌ Non envoyé', inline: true }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setFooter({ text: 'L\'utilisateur ne pourra pas envoyer de messages, réagir ou parler en vocal.' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Logger l'action
        await logModeration(
            interaction.guild, 
            'Timeout', 
            target, 
            interaction.user, 
            reason, 
            `Sanction #${sanctionNumber} - ${duration}`
        );

    } catch (error) {
        console.error('Erreur lors du placement en timeout:', error);
        await interaction.editReply('❌ Une erreur est survenue lors du placement en timeout.');
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
