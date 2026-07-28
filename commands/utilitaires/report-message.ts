import { ApplicationCommandType, ContextMenuCommandBuilder, type MessageContextMenuCommandInteraction } from 'discord.js';
import { openReportModal } from '../../utils/reporting.ts';

export const data = new ContextMenuCommandBuilder()
    .setName('Signaler ce message')
    .setType(ApplicationCommandType.Message);

export async function execute(interaction: MessageContextMenuCommandInteraction) {
    const message = interaction.targetMessage;
    await openReportModal(interaction, message.author, message);
}
