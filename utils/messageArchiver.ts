import { Message, Collection } from 'discord.js';

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

    console.log(`[MessageArchiver] Archive formatée: ${archive.length} caractères`);
    return archive;
}

/**
 * Upload vers Pastebin et retourne l'URL avec monitoring détaillé
 */
export async function uploadToPastebin(content: string, title: string): Promise<string | null> {
    console.log('[Pastebin] Début de l\'upload...');
    console.log(`[Pastebin] Titre: ${title}`);
    console.log(`[Pastebin] Taille du contenu: ${content.length} caractères`);
    
    const apiKey = Deno.env.get('PASTEBIN_API_KEY');
    
    if (!apiKey) {
        console.error('[Pastebin] ❌ ERREUR: Clé API Pastebin non configurée dans les variables d\'environnement');
        console.error('[Pastebin] Vérifiez que PASTEBIN_API_KEY est définie dans votre fichier .env');
        return null;
    }
    
    console.log(`[Pastebin] ✓ Clé API trouvée (${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)})`);

    try {
        const formData = new URLSearchParams({
            api_dev_key: apiKey,
            api_option: 'paste',
            api_paste_code: content,
            api_paste_name: title,
            api_paste_private: '1', // 0=public, 1=unlisted, 2=private
            api_paste_expire_date: '1M' // Expire dans 1 mois
        });
        
        console.log('[Pastebin] Paramètres de la requête:');
        console.log(`  - api_option: paste`);
        console.log(`  - api_paste_private: 1 (unlisted)`);
        console.log(`  - api_paste_expire_date: 1M`);
        console.log(`  - api_paste_name: ${title}`);
        console.log(`  - Longueur du body: ${formData.toString().length} caractères`);

        console.log('[Pastebin] Envoi de la requête à https://pastebin.com/api/api_post.php...');
        const response = await fetch('https://pastebin.com/api/api_post.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        console.log(`[Pastebin] Statut HTTP: ${response.status} ${response.statusText}`);
        
        const result = await response.text();
        console.log(`[Pastebin] Réponse brute: ${result}`);
        
        // Si la réponse contient "Bad API request", c'est une erreur
        if (result.includes('Bad API request')) {
            console.error('[Pastebin] ❌ ERREUR API Pastebin:', result);
            console.error('[Pastebin] Causes possibles:');
            console.error('  - Clé API invalide ou expirée');
            console.error('  - Limite de rate limit atteinte');
            console.error('  - Format de requête incorrect');
            return null;
        }

        // Si la réponse commence par http, c'est un succès
        if (result.startsWith('http')) {
            console.log(`[Pastebin] ✅ SUCCÈS! URL générée: ${result}`);
            return result;
        }

        console.error('[Pastebin] ❌ Réponse inattendue (ni erreur ni URL valide):', result);
        console.error('[Pastebin] Type de réponse:', typeof result);
        console.error('[Pastebin] Longueur de la réponse:', result.length);
        return null;
    } catch (error) {
        console.error('[Pastebin] ❌ EXCEPTION lors de l\'upload:', error);
        console.error('[Pastebin] Type d\'erreur:', error.constructor.name);
        if (error instanceof Error) {
            console.error('[Pastebin] Message d\'erreur:', error.message);
            console.error('[Pastebin] Stack trace:', error.stack);
        }
        return null;
    }
}
