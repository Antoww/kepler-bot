import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, GuildMember, User } from 'discord.js';
import { logModeration } from '../../utils/moderationLogger.ts';
import { createTempBan, addModerationHistory } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un utilisateur du serveur')
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('L\'utilisateur à bannir')
        .setRequired(true))
    .addStringOption(option => option.setName('raison')
        .setDescription('La raison du bannissement')
        .setRequired(false))
    .addStringOption(option => option.setName('duree')
        .setDescription('Durée du ban (ex: 1d, 2h, 30m) - laissez vide pour un ban permanent')
        .setRequired(false))
    .addIntegerOption(option => option.setName('suppression_messages')
        .setDescription('Nombre de jours de messages à supprimer (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const target = interaction.options.getUser('utilisateur');
    const reason = interaction.options.getString('raison') || 'Aucune raison fournie';
    const duration = interaction.options.getString('duree');
    const deleteMessageDays = interaction.options.getInteger('suppression_messages') || 0;

    if (!target) {
        await interaction.reply('Utilisateur invalide.');
        return;
    }

    // Vérifications de sécurité
    const member = interaction.member as GuildMember;
    const targetMember = interaction.guild.members.cache.get(target.id);

    if (target.id === interaction.user.id) {
        await interaction.reply('❌ Vous ne pouvez pas vous bannir vous-même.');
        return;
    }

    if (target.id === interaction.client.user?.id) {
        await interaction.reply('❌ Je ne peux pas me bannir moi-même.');
        return;
    }

    if (targetMember && member.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply('❌ Vous ne pouvez pas bannir cet utilisateur car il a un rôle égal ou supérieur au vôtre.');
        return;
    }

    try {
        let banDuration: Date | undefined;
        let durationText = 'Permanent';

        // Parser la durée si fournie
        if (duration) {
            const parsedDuration = parseDuration(duration);
            if (!parsedDuration) {
                await interaction.reply('❌ Format de durée invalide. Utilisez des formats comme: 1d, 2h, 30m, 1w');
                return;
            }
            banDuration = parsedDuration;
            durationText = duration;
        }

        // Bannir l'utilisateur
        await interaction.guild.members.ban(target, {
            reason: `${reason} - Par ${interaction.user.tag}`,
            deleteMessageDays: deleteMessageDays
        });

        // Si c'est un ban temporaire, l'enregistrer en base
        if (banDuration) {
            await createTempBan(interaction.guild.id, target.id, interaction.user.id, reason, banDuration);
        }

        // Ajouter à l'historique de modération
        const sanctionNumber = await addModerationHistory(
            interaction.guild.id, 
            target.id, 
            interaction.user.id, 
            banDuration ? 'tempban' : 'ban', 
            reason, 
            durationText === 'Permanent' ? undefined : durationText
        );

        // Créer l'embed de confirmation
        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('🔨 Utilisateur banni')
            .addFields(
                { name: '📋 Sanction N°', value: `#${sanctionNumber}`, inline: true },
                { name: '👤 Utilisateur', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Modérateur', value: interaction.user.tag, inline: true },
                { name: '📝 Raison', value: reason, inline: false },
                { name: '⏰ Durée', value: durationText, inline: true }
            )
            .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
            .setTimestamp();

        if (deleteMessageDays > 0) {
            embed.addFields({ name: '🗑️ Messages supprimés', value: `${deleteMessageDays} jour(s)`, inline: true });
        }

        await interaction.reply({ embeds: [embed] });

        // Logger l'action
        await logModeration(interaction.guild, 'Ban', target, interaction.user, reason, `Sanction #${sanctionNumber} - ${durationText}`);

    } catch (error) {
        console.error('Erreur lors du bannissement:', error);
        await interaction.reply('❌ Une erreur est survenue lors du bannissement.');
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
