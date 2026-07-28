import { type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { KEPLER_MESSAGES } from '../../utils/theme.ts';
import { openReportModal } from '../../utils/reports/service.ts';

export const data = new SlashCommandBuilder()
    .setName('report')
    .setDescription('Signaler un utilisateur à la modération')
    .addSubcommand(subcommand => subcommand
        .setName('user')
        .setDescription('Signaler un utilisateur')
        .addUserOption(option => option
            .setName('utilisateur')
            .setDescription('Utilisateur à signaler')
            .setRequired(true)));

export async function execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('utilisateur', true);
    if (!target) {
        await interaction.reply({ content: KEPLER_MESSAGES.invalidUser, ephemeral: true });
        return;
    }
    await openReportModal(interaction, target);
}
