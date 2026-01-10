import { Message, Collection } from 'discord.js';
import { logger } from './logger.ts';

/**
 * Formate les messages supprimés en texte lisible
 */
export function formatMessagesForArchive(messages: Collection<string, Message>): string {
    const sortedMessages = Array.from(messages.values()).sort(
        (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    let archive = `=== ARCHIVE DES MESSAGES SUPPRIMÉS ===\n`;
    archive += `Date de suppression: ${new Date().toLocaleString('fr-FR', { 
        timeZone: 'Europe/Paris',
        dateStyle: 'full',
        timeStyle: 'long'
    })}\n`;
    archive += `Nombre de messages: ${messages.size}\n`;
    archive += `${'='.repeat(60)}\n\n`;

    sortedMessages.forEach((msg, index) => {
        const author = msg.author;
        const createdAt = new Date(msg.createdTimestamp);
        
        archive += `[Message #${index + 1}]\n`;
        archive += `Auteur: ${author.tag} (${author.username})\n`;
        archive += `ID Auteur: ${author.id}\n`;
        archive += `Date: ${createdAt.toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        })}\n`;
        archive += `Heure: ${createdAt.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        })}\n`;
        archive += `ID Message: ${msg.id}\n`;
        
        if (msg.content) {
            archive += `Contenu:\n${msg.content}\n`;
        } else {
            archive += `Contenu: [Aucun contenu textuel]\n`;
        }

        if (msg.attachments.size > 0) {
            archive += `Pièces jointes (${msg.attachments.size}):\n`;
            msg.attachments.forEach(att => {
                archive += `  - ${att.name || 'Sans nom'}: ${att.url}\n`;
            });
        }

        if (msg.embeds.length > 0) {
            archive += `Embeds: ${msg.embeds.length} embed(s) présent(s)\n`;
        }

        archive += `${'-'.repeat(60)}\n\n`;
    });

    logger.debug(`Archive formatée: ${archive.length} caractères`, undefined, 'Archiver');
    return archive;
}

/**
 * Upload vers Pastebin et retourne l'URL avec monitoring détaillé
 */
export async function uploadToPastebin(content: string, title: string): Promise<string | null> {
    logger.debug(`Upload Pastebin: ${title} (${content.length} car.)`, undefined, 'Pastebin');
    
    const apiKey = Deno.env.get('PASTEBIN_API_KEY');
    
    if (!apiKey) {
        logger.error('Clé API Pastebin manquante', undefined, 'Pastebin');
        return null;
    }

    try {
        const formData = new URLSearchParams({
            api_dev_key: apiKey,
            api_option: 'paste',
            api_paste_code: content,
            api_paste_name: title,
            api_paste_private: '1', // 0=public, 1=unlisted, 2=private
            api_paste_expire_date: '1M' // Expire dans 1 mois
        });

        const response = await fetch('https://pastebin.com/api/api_post.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });
        
        const result = await response.text();
        
        // Si la réponse contient "Bad API request", c'est une erreur
        if (result.includes('Bad API request')) {
            logger.error('Erreur API Pastebin', result, 'Pastebin');
            return null;
        }

        // Si la réponse commence par http, c'est un succès
        if (result.startsWith('http')) {
            logger.success('Archive uploadée', result, 'Pastebin');
            return result;
        }

        logger.error('Réponse inattendue de Pastebin', result, 'Pastebin');
        return null;
    } catch (error) {
        logger.error('Exception lors de l\'upload', error, 'Pastebin');
        return null;
    }
}
