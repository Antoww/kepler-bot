import { ActionRowBuilder, ButtonBuilder, ButtonStyle, type ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { createKeplerEmbed, KEPLER_MESSAGES, setRequesterFooter } from '../../utils/theme.ts';

const SYMBOLS = ['🍒', '🍒', '🍋', '🍋', '🍇', '🔔', '⭐', '7️⃣'];

export const data = new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Joue à la machine à sous de Kepler');

export async function execute(interaction: ChatInputCommandInteraction) {
    const response = await interaction.reply({ ...spin(interaction), fetchReply: true });
    const collector = response.createMessageComponentCollector({ time: 60_000 });
    collector.on('collect', async component => {
        if (component.user.id !== interaction.user.id) {
            await component.reply({ content: KEPLER_MESSAGES.unauthorizedComponent, ephemeral: true });
            return;
        }
        await component.update(spin(interaction));
    });
    collector.on('end', async () => {
        const disabled = replayButton().setDisabled(true);
        await interaction.editReply({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(disabled)] }).catch(() => null);
    });
}

function spin(interaction: ChatInputCommandInteraction) {
    const reels = Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    const counts = reels.reduce<Record<string, number>>((result, symbol) => {
        result[symbol] = (result[symbol] ?? 0) + 1;
        return result;
    }, {});
    const bestMatch = Math.max(...Object.values(counts));
    const jackpot = bestMatch === 3;
    const pair = bestMatch === 2;
    const result = jackpot ? 'Jackpot !' : pair ? 'Une paire !' : 'Pas cette fois';
    const reward = jackpot ? (reels[0] === '7️⃣' ? 1000 : 250) : pair ? 25 : 0;
    const embed = setRequesterFooter(
        createKeplerEmbed(jackpot ? 'success' : pair ? 'warning' : 'neutral')
            .setTitle('🎰 Kepler Slots')
            .setDescription(`┏━━━━━━━━━━┓\n┃  ${reels.join('  │  ')}  ┃\n┗━━━━━━━━━━┛`)
            .addFields(
                { name: 'Résultat', value: result, inline: true },
                { name: 'Gain virtuel', value: `**${reward}** crédits`, inline: true }
            ),
        interaction.user
    );
    return { content: '', embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(replayButton())] };
}

function replayButton() {
    return new ButtonBuilder().setCustomId('slots:spin').setLabel('Relancer').setEmoji('🎰').setStyle(ButtonStyle.Primary);
}
