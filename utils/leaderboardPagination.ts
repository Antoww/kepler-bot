import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    type ChatInputCommandInteraction,
    type InteractionEditReplyOptions,
    type Message,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';
import { KEPLER_MESSAGES } from './theme.ts';

export const LEADERBOARD_PAGE_SIZE = 10;
const PAGINATION_TIMEOUT = 5 * 60 * 1000;

export function leaderboardControls(prefix: string, page: number, totalPages: number, disabled = false) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId(`${prefix}:previous`)
            .setEmoji('◀️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page === 0),
        new ButtonBuilder()
            .setCustomId(`${prefix}:jump`)
            .setLabel(`Page ${page + 1}/${totalPages}`)
            .setEmoji('🔢')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || totalPages <= 1),
        new ButtonBuilder()
            .setCustomId(`${prefix}:next`)
            .setEmoji('▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled || page >= totalPages - 1)
    );
}

export function attachLeaderboardPagination(
    interaction: ChatInputCommandInteraction,
    message: Message,
    prefix: string,
    totalPages: number,
    render: (page: number, disabled?: boolean) => InteractionEditReplyOptions
) {
    if (totalPages <= 1) return;
    let currentPage = 0;
    const collector = message.createMessageComponentCollector({
        time: PAGINATION_TIMEOUT,
        filter: component => component.customId.startsWith(`${prefix}:`)
    });

    collector.on('collect', async component => {
        if (!component.isButton()) return;
        if (component.user.id !== interaction.user.id) {
            await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
            return;
        }

        if (component.customId === `${prefix}:previous`) {
            currentPage = Math.max(0, currentPage - 1);
            await component.update(render(currentPage));
            return;
        }
        if (component.customId === `${prefix}:next`) {
            currentPage = Math.min(totalPages - 1, currentPage + 1);
            await component.update(render(currentPage));
            return;
        }

        const modal = new ModalBuilder()
            .setCustomId(`${prefix}:jump-modal`)
            .setTitle('Aller à une page')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                    new TextInputBuilder()
                        .setCustomId('page')
                        .setLabel(`Numéro de page (1 à ${totalPages})`)
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(String(totalPages).length)
                )
            );
        await component.showModal(modal);
        const submission = await component.awaitModalSubmit({
            time: 60_000,
            filter: modalInteraction =>
                modalInteraction.user.id === interaction.user.id &&
                modalInteraction.customId === `${prefix}:jump-modal`
        }).catch(() => null);
        if (!submission) return;

        const requestedPage = Number(submission.fields.getTextInputValue('page'));
        if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > totalPages) {
            await submission.reply({
                content: `❌ Entrez un numéro de page entre 1 et ${totalPages}.`,
                ephemeral: true
            });
            return;
        }
        currentPage = requestedPage - 1;
        await submission.deferUpdate();
        await submission.editReply(render(currentPage));
    });

    collector.on('end', async () => {
        try {
            await interaction.editReply(render(currentPage, true));
        } catch {
            // Le message peut avoir été supprimé entre-temps.
        }
    });
}
