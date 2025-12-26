import { type CommandInteraction, SlashCommandBuilder, ChannelType, TextChannel, PermissionFlagsBits, Message } from "discord.js";
import { formatMessagesForArchive, uploadToPastebin } from "../../utils/messageArchiver.ts";
import { storeArchiveUrl } from "../../utils/archiveCache.ts";

export const data = new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages')
    .addIntegerOption(option => option.setName('nombre')
        .setDescription('Nombre de messages à supprimer')
    .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {

    if (!interaction.guild) {
        interaction.reply('Erreur : Vous devez être sur un serveur Discord.')
        return;
    }

    const amount = interaction.options.get('nombre')?.value as number;
    if (amount < 1 || amount > 100) {
        interaction.reply('Erreur : Vous devez entrer un nombre entre 1 et 100.');
        return;
    }

    if (interaction.channel?.isTextBased() && interaction.channel.type === ChannelType.GuildText) {
        const textChannel = interaction.channel as TextChannel;

        await textChannel.bulkDelete(amount, true)
            .then(async (messages) => {
                const messageCount = messages.size;
                const messageText = messageCount === 1 ? 'message' : 'messages';
                
                // Archiver uniquement les messages qui ont été effectivement supprimés
                console.log(`[Clear] Début de l'archivage de ${messageCount} messages supprimés...`);
                
                if (messages.size > 0) {
                    const archiveContent = formatMessagesForArchive(messages as any);
                    const title = `Messages supprimés - ${interaction.guild?.name} - ${new Date().toLocaleString('fr-FR')}`;
                    
                    console.log(`[Clear] Tentative d'upload sur Pastebin...`);
                    const pastebinUrl = await uploadToPastebin(archiveContent, title);
                    
                    if (pastebinUrl) {
                        console.log(`[Clear] ✅ Archive créée avec succès: ${pastebinUrl}`);
                        // Stocker l'URL dans le cache pour l'événement MessageBulkDelete
                        const messageIds = Array.from(messages.keys());
                        storeArchiveUrl(interaction.guild!.id, textChannel.id, messageIds, pastebinUrl);
                    } else {
                        console.error('[Clear] ❌ Échec de la création de l\'archive Pastebin');
                        console.error('[Clear] Vérifiez les logs ci-dessus pour plus de détails');
                    }
                }
                
                // Répondre et supprimer le message après 10 secondes
                interaction.reply(`🗑️ Suppression de **${messageCount} ${messageText}**.`)
                    .then(reply => {
                        setTimeout(() => {
                            reply.delete().catch(() => {});
                        }, 10000);
                    })
                    .catch(error => {
                        console.error('[Clear] Erreur lors de l\'envoi de la réponse:', error);
                    });
            })
            .catch(error => {
                console.error('Erreur lors de la suppression des messages :', error);
                interaction.reply('Erreur lors de la suppression des messages.');
            });
    } else {
        interaction.reply('Erreur : Impossible de trouver le canal ou le canal n\'est pas un canal de texte.');
    }

} 