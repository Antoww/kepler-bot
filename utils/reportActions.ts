import {
    ActionRowBuilder,
    ButtonBuilder,
    type ButtonInteraction,
    EmbedBuilder,
    type GuildMember,
    ModalBuilder,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { addModerationHistory, createTempBan, createWarning } from '../database/db.ts';
import { logModeration } from './moderationLogger.ts';
import { KEPLER_MESSAGES } from './theme.ts';
import { logger } from './logger.ts';

type ReportAction = 'warn' | 'timeout' | 'kick' | 'ban';

const ACTION_LABELS: Record<ReportAction, string> = {
    warn: 'Avertissement',
    timeout: 'Timeout',
    kick: 'Expulsion',
    ban: 'Bannissement'
};

export async function handleReportActionButton(interaction: ButtonInteraction): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }

    const [, , actionValue, targetId] = interaction.customId.split(':');
    const action = actionValue as ReportAction;
    if (!ACTION_LABELS[action] || !targetId) {
        await interaction.reply({ content: '❌ Cette action de modération est invalide.', ephemeral: true });
        return;
    }

    const requiredPermission = action === 'ban'
        ? PermissionFlagsBits.BanMembers
        : action === 'kick'
            ? PermissionFlagsBits.KickMembers
            : PermissionFlagsBits.ModerateMembers;
    if (!interaction.memberPermissions?.has(requiredPermission)) {
        await interaction.reply({ content: '❌ Vous n’avez pas la permission nécessaire pour cette action.', ephemeral: true });
        return;
    }

    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    if (!target) {
        await interaction.reply({ content: KEPLER_MESSAGES.invalidUser, ephemeral: true });
        return;
    }
    if (target.id === interaction.user.id || target.id === interaction.client.user.id) {
        await interaction.reply({ content: '❌ Cette action ne peut pas cibler cet utilisateur.', ephemeral: true });
        return;
    }

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    const moderator = interaction.member as GuildMember;
    if (targetMember && moderator.roles.highest.position <= targetMember.roles.highest.position) {
        await interaction.reply({ content: '❌ Cet utilisateur possède un rôle égal ou supérieur au vôtre.', ephemeral: true });
        return;
    }

    const modalId = `report:action:${action}:${target.id}:${interaction.id}`;
    await interaction.showModal(buildActionModal(action, modalId));

    try {
        const submission = await interaction.awaitModalSubmit({
            filter: modal => modal.user.id === interaction.user.id && modal.customId === modalId,
            time: 5 * 60 * 1000
        });
        await submission.deferReply({ ephemeral: true });
        const reason = submission.fields.getTextInputValue('reason').trim();
        const durationInput = submission.fields.getTextInputValue('duration').trim();
        const duration = action === 'timeout' ? (durationInput || '1h') : action === 'ban' ? durationInput : '';
        const proof = submission.fields.getTextInputValue('proof').trim();

        try {
            const sanctionNumber = await executeAction(interaction, action, target.id, reason, duration, proof);
            await markReportHandled(interaction, action, sanctionNumber, reason, duration, proof);
            await submission.editReply(`✅ ${ACTION_LABELS[action]} appliqué${action === 'kick' ? 'e' : ''}. Sanction **#${sanctionNumber}**.`);
        } catch (error: any) {
            logger.error(`Échec action report ${action}`, error, 'ReportActions');
            await submission.editReply(`❌ ${error?.message || 'Impossible d’appliquer cette sanction.'}`);
        }
    } catch (error: any) {
        if (error?.code === 'InteractionCollectorError') return;
        logger.error('Erreur dans la modale de sanction du report', error, 'ReportActions');
    }
}

function buildActionModal(action: ReportAction, customId: string): ModalBuilder {
    const reason = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Raison')
        .setPlaceholder('Raison de la sanction')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(3)
        .setMaxLength(500)
        .setRequired(true);
    const duration = new TextInputBuilder()
        .setCustomId('duration')
        .setLabel('Durée (facultatif)')
        .setPlaceholder(action === 'timeout'
            ? 'Ex. 30m, 12h, 7d · défaut : 1h'
            : action === 'ban'
                ? 'Ex. 1d, 1w · permanent si vide'
                : 'Non utilisée pour cette action')
        .setStyle(TextInputStyle.Short)
        .setMaxLength(20)
        .setRequired(false);
    const proof = new TextInputBuilder()
        .setCustomId('proof')
        .setLabel('Preuve (facultatif)')
        .setPlaceholder('Lien vers un message, une image ou contexte complémentaire')
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(500)
        .setRequired(false);

    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(ACTION_LABELS[action])
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(reason),
            new ActionRowBuilder<TextInputBuilder>().addComponents(duration),
            new ActionRowBuilder<TextInputBuilder>().addComponents(proof)
        );
}

async function executeAction(
    interaction: ButtonInteraction,
    action: ReportAction,
    targetId: string,
    reason: string,
    durationInput: string,
    proof: string
): Promise<number> {
    const guild = interaction.guild!;
    const target = await interaction.client.users.fetch(targetId);
    const targetMember = await guild.members.fetch(targetId).catch(() => null);
    const storedReason = proof ? `${reason}\nPreuve : ${proof}` : reason;
    let duration = durationInput;

    if (action === 'warn') {
        const sanctionNumber = await createWarning(guild.id, target.id, interaction.user.id, storedReason);
        await addModerationHistory(guild.id, target.id, interaction.user.id, 'warn', storedReason, undefined, sanctionNumber);
        await logModeration(guild, 'Warn', target, interaction.user, storedReason, `Sanction #${sanctionNumber}`);
        return sanctionNumber;
    }

    if (action === 'timeout') {
        if (!targetMember) throw new Error('Cet utilisateur n’est plus présent sur le serveur.');
        if (!targetMember.moderatable) throw new Error('Je ne peux pas placer cet utilisateur en timeout.');
        duration = duration || '1h';
        const timeoutMs = parseDuration(duration);
        if (!timeoutMs) throw new Error('Durée invalide. Utilisez par exemple `30m`, `12h`, `7d` ou `1w`.');
        if (timeoutMs > 28 * 24 * 60 * 60 * 1000) throw new Error('Un timeout ne peut pas dépasser 28 jours.');
        await targetMember.timeout(timeoutMs, `${reason} - Par ${interaction.user.tag}`);
    } else if (action === 'kick') {
        if (!targetMember) throw new Error('Cet utilisateur n’est plus présent sur le serveur.');
        if (!targetMember.kickable) throw new Error('Je ne peux pas expulser cet utilisateur.');
        await targetMember.kick(`${reason} - Par ${interaction.user.tag}`);
        duration = '';
    } else {
        if (targetMember && !targetMember.bannable) throw new Error('Je ne peux pas bannir cet utilisateur.');
        let endTime: Date | null = null;
        if (duration) {
            const durationMs = parseDuration(duration);
            if (!durationMs) throw new Error('Durée invalide. Utilisez par exemple `1d` ou `1w`.');
            endTime = new Date(Date.now() + durationMs);
        }
        await guild.members.ban(target, { reason: `${reason} - Par ${interaction.user.tag}` });
        if (endTime) await createTempBan(guild.id, target.id, interaction.user.id, storedReason, endTime);
    }

    const actionType = action === 'ban' && duration ? 'tempban' : action;
    const sanctionNumber = await addModerationHistory(
        guild.id,
        target.id,
        interaction.user.id,
        actionType,
        storedReason,
        duration || undefined
    );
    await logModeration(guild, ACTION_LABELS[action], target, interaction.user, storedReason, `Sanction #${sanctionNumber}${duration ? ` - ${duration}` : ''}`);
    return sanctionNumber;
}

async function markReportHandled(
    interaction: ButtonInteraction,
    action: ReportAction,
    sanctionNumber: number,
    reason: string,
    duration: string,
    proof: string
) {
    const embed = interaction.message.embeds[0]
        ? EmbedBuilder.from(interaction.message.embeds[0].toJSON())
        : new EmbedBuilder();
    embed.addFields({
        name: '✅ Traitement du signalement',
        value: [
            `**Action :** ${ACTION_LABELS[action]} · sanction #${sanctionNumber}`,
            `**Modérateur :** ${interaction.user}`,
            `**Raison :** ${reason}`,
            duration ? `**Durée :** ${duration}` : '',
            proof ? `**Preuve :** ${proof}` : ''
        ].filter(Boolean).join('\n').slice(0, 1024),
        inline: false
    });
    const disabledRows = interaction.message.components.map(row =>
        new ActionRowBuilder<ButtonBuilder>().addComponents(
            row.components.map(component => ButtonBuilder.from(component as any).setDisabled(true))
        )
    );
    await interaction.message.edit({ embeds: [embed], components: disabledRows });
}

function parseDuration(value: string): number | null {
    const match = value.toLowerCase().match(/^(\d+)([smhdw])$/);
    if (!match) return null;
    const amount = Number(match[1]);
    if (!Number.isSafeInteger(amount) || amount <= 0) return null;
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
    return amount * multipliers[match[2]];
}
