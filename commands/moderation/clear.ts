import { KEPLER_MESSAGES } from '../../utils/theme.ts';
import {
    type CommandInteraction,
    SlashCommandBuilder,
    ChannelType,
    TextChannel,
    PermissionFlagsBits,
    Collection,
    type Message
} from "discord.js";
import { formatMessagesForArchive, uploadToPastebin } from "../../utils/moderation/messageArchiver.ts";
import { storeArchiveUrl } from "../../utils/moderation/archiveCache.ts";
import { getServerTimezone } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages')
    .addIntegerOption(option => option.setName('nombre')
        .setDescription('Nombre de messages à supprimer')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true))
    .addUserOption(option => option.setName('utilisateur')
        .setDescription('Supprimer uniquement les messages de cet utilisateur')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply(KEPLER_MESSAGES.guildOnly);
        return;
    }

    const amount = interaction.options.get('nombre')?.value as number;
    if (amount < 1 || amount > 100) {
        await interaction.reply(`❌ Le nombre de messages doit être compris entre 1 et 100.`);
        return;
    }

    if (!interaction.channel?.isTextBased() || interaction.channel.type !== ChannelType.GuildText) {
        await interaction.reply('❌ Cette commande doit être utilisée dans un salon textuel.');
        return;
    }

    await interaction.deferReply();
    const textChannel = interaction.channel as TextChannel;
    const target = interaction.options.getUser('utilisateur');

    try {
        const messages = target
            ? await deleteUserMessages(textChannel, target.id, amount)
            : await textChannel.bulkDelete(amount, true);
        const messageCount = messages.size;
        const messageText = messageCount === 1 ? 'message' : 'messages';
        const timezone = await getServerTimezone(interaction.guild.id);

        if (messages.size > 0) {
            console.log(`[Clear] Début de l'archivage de ${messageCount} messages supprimés...`);
            const archiveContent = formatMessagesForArchive(messages as any, timezone);
            const title = `Messages supprimés - ${interaction.guild.name} - ${new Date().toLocaleString('fr-FR', { timeZone: timezone })}`;
            const pastebinUrl = await uploadToPastebin(archiveContent, title);

            if (pastebinUrl) {
                storeArchiveUrl(
                    interaction.guild.id,
                    textChannel.id,
                    Array.from(messages.keys()),
                    pastebinUrl
                );
            } else {
                console.error('[Clear] Échec de la création de l’archive Pastebin');
            }
        }

        const targetText = target ? ` de ${target}` : '';
        const detail = target && messageCount < amount
            ? ` Seuls les messages correspondants trouvés parmi les 1 000 plus récents et datant de moins de 14 jours ont été supprimés.`
            : '';
        await interaction.editReply(`🗑️ Suppression de **${messageCount} ${messageText}**${targetText}.${detail}`);
        setTimeout(() => void interaction.deleteReply().catch(() => undefined), 10_000);
    } catch (error) {
        console.error('Erreur lors de la suppression des messages :', error);
        await interaction.editReply('❌ Impossible de supprimer les messages. Vérifiez leur ancienneté et mes permissions.');
    }
}

async function deleteUserMessages(
    channel: TextChannel,
    userId: string,
    amount: number
): Promise<Collection<string, Message>> {
    const selected = new Collection<string, Message>();
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    let before: string | undefined;
    let scanned = 0;

    while (selected.size < amount && scanned < 1000) {
        const page = await channel.messages.fetch({ limit: 100, before });
        if (!page.size) break;
        scanned += page.size;

        for (const message of page.values()) {
            if (message.createdTimestamp <= fourteenDaysAgo) continue;
            if (message.author.id === userId) {
                selected.set(message.id, message);
                if (selected.size >= amount) break;
            }
        }

        const oldest = page.last();
        if (!oldest || oldest.createdTimestamp <= fourteenDaysAgo) break;
        before = oldest.id;
    }

    if (!selected.size) return selected;
    return await channel.bulkDelete(selected, true);
}
