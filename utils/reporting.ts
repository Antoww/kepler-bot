import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type ChatInputCommandInteraction,
    type Message,
    type MessageContextMenuCommandInteraction,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    type User
} from 'discord.js';
import { getReportChannel, getReportRole } from '../database/db.ts';
import { createKeplerEmbed, KEPLER_MESSAGES } from './theme.ts';
import { logger } from './logger.ts';

type ReportInteraction = ChatInputCommandInteraction | MessageContextMenuCommandInteraction;

export async function openReportModal(
    interaction: ReportInteraction,
    target: User,
    sourceMessage?: Message
): Promise<void> {
    if (!interaction.guild) {
        await interaction.reply({ content: KEPLER_MESSAGES.guildOnly, ephemeral: true });
        return;
    }

    const configuredChannelId = await getReportChannel(interaction.guild.id);
    if (!configuredChannelId) {
        await interaction.reply({
            content: '❌ Le système de signalement n’est pas encore configuré sur ce serveur.',
            ephemeral: true
        });
        return;
    }

    const customId = `report:reason:${interaction.id}`;
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Raison du signalement')
        .setPlaceholder('Décrivez précisément le problème rencontré')
        .setStyle(TextInputStyle.Paragraph)
        .setMinLength(10)
        .setMaxLength(1000)
        .setRequired(true);
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(`Signaler ${target.username}`)
        .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));

    await interaction.showModal(modal);
    try {
        const submission = await interaction.awaitModalSubmit({
            filter: modalInteraction => modalInteraction.user.id === interaction.user.id
                && modalInteraction.customId === customId,
            time: 5 * 60 * 1000
        });
        await submission.deferReply({ ephemeral: true });
        try {
            await sendReport(submission.guild!, submission.user, target, submission.fields.getTextInputValue('reason'), sourceMessage);
            await submission.editReply('✅ Votre signalement a été transmis à l’équipe de modération.');
        } catch (error) {
            logger.error('Impossible de transmettre le report', error, 'Reporting');
            await submission.editReply('❌ Le signalement n’a pas pu être transmis. Prévenez un administrateur du serveur.');
        }
    } catch (error: any) {
        if (error?.code === 'InteractionCollectorError') return;
        logger.error('Erreur lors de la création du report', error, 'Reporting');
    }
}

async function sendReport(
    guild: NonNullable<ReportInteraction['guild']>,
    reporter: User,
    target: User,
    reason: string,
    sourceMessage?: Message
): Promise<void> {
    const [channelId, roleId] = await Promise.all([
        getReportChannel(guild.id),
        getReportRole(guild.id)
    ]);
    if (!channelId) throw new Error('Aucun salon de report configuré');

    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) throw new Error('Le salon de report configuré est introuvable');

    const role = roleId ? await guild.roles.fetch(roleId).catch(() => null) : null;
    const embed = createKeplerEmbed('danger')
        .setTitle('🚩 Nouveau signalement')
        .setDescription(`Un signalement concernant ${target} a été envoyé à l’équipe de modération.`)
        .addFields(
            { name: '👤 Utilisateur signalé', value: `${target.tag}\n\`${target.id}\``, inline: true },
            { name: '📨 Signalé par', value: `${reporter.tag}\n\`${reporter.id}\``, inline: true },
            { name: '📝 Raison', value: reason, inline: false }
        )
        .setThumbnail(target.displayAvatarURL({ forceStatic: true }));

    if (sourceMessage) {
        embed.addFields(
            { name: '💬 Message concerné', value: `[Ouvrir le message](${sourceMessage.url}) dans ${sourceMessage.channel}`, inline: false },
            { name: '📄 Contenu', value: truncate(sourceMessage.content || '*Aucun contenu textuel*', 1024), inline: false }
        );
        const attachments = sourceMessage.attachments.map(attachment => attachment.url).slice(0, 5);
        if (attachments.length) {
            embed.addFields({ name: '📎 Pièces jointes', value: truncate(attachments.join('\n'), 1024), inline: false });
        }
    }

    await channel.send({
        content: role ? `${role}` : undefined,
        embeds: [embed],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`report:moderate:warn:${target.id}`).setLabel('Warn').setEmoji('⚠️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`report:moderate:timeout:${target.id}`).setLabel('Timeout').setEmoji('⏱️').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`report:moderate:kick:${target.id}`).setLabel('Kick').setEmoji('👢').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId(`report:moderate:ban:${target.id}`).setLabel('Ban').setEmoji('🔨').setStyle(ButtonStyle.Danger)
        )],
        allowedMentions: { roles: role ? [role.id] : [] }
    });
}

function truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
