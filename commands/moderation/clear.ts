import { type CommandInteraction, SlashCommandBuilder, ChannelType, TextChannel, PermissionFlagsBits, Message } from "discord.js";
import { formatMessagesForArchive, uploadToPastebin, saveToLocalFile } from "../../utils/messageArchiver.ts";

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
        
        // Récupérer les messages avant de les supprimer pour archivage
        const messagesToDelete = await textChannel.messages.fetch({ limit: amount });
        const filteredMessages = messagesToDelete.filter(msg => 
            (Date.now() - msg.createdTimestamp) < 1209600000 // Messages de moins de 14 jours
        );

        await textChannel.bulkDelete(amount, true)
            .then(async (messages) => {
                const messageCount = messages.size;
                const messageText = messageCount === 1 ? 'message' : 'messages';
                
                // Archiver les messages supprimés
                let archiveInfo = '';
                if (messages.size > 0) {
                    const archiveContent = formatMessagesForArchive(messages as any);
                    const timestamp = Date.now();
                    const title = `Messages supprimés - ${interaction.guild?.name} - ${new Date().toLocaleString('fr-FR')}`;
                    
                    // Essayer d'uploader sur Pastebin
                    const pastebinUrl = await uploadToPastebin(archiveContent, title);
                    
                    if (pastebinUrl) {
                        archiveInfo = `\n📄 Archive disponible : ${pastebinUrl}`;
                        // Stocker l'URL pour les logs
                        (messages as any).archiveUrl = pastebinUrl;
                    } else {
                        // Fallback : sauvegarder localement
                        try {
                            const localPath = await saveToLocalFile(archiveContent, interaction.guild!.id, timestamp);
                            archiveInfo = `\n📁 Archive sauvegardée localement : ${localPath}`;
                            (messages as any).archiveUrl = `local:${localPath}`;
                        } catch (error) {
                            console.error('Impossible de sauvegarder l\'archive:', error);
                            (messages as any).archiveUrl = null;
                        }
                    }
                }
                
                interaction.reply(`🗑️ Suppression de **${messageCount} ${messageText}**.${archiveInfo}`);
            })
            .catch(error => {
                console.error('Erreur lors de la suppression des messages :', error);
                interaction.reply('Erreur lors de la suppression des messages.');
            });
    } else {
        interaction.reply('Erreur : Impossible de trouver le canal ou le canal n\'est pas un canal de texte.');
    }

} 