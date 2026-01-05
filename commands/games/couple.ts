import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, type User } from 'discord.js';
import sharp from 'sharp';
import axios from 'axios';
import { Buffer } from 'node:buffer';

// Cache simple pour les avatars (évite les téléchargements répétés)
const avatarCache = new Map<string, { buffer: Buffer; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const data = new SlashCommandBuilder()
    .setName('couple')
    .setDescription('Crée un couple avec deux membres du serveur')
    .addUserOption(option => option.setName('personne1')
        .setDescription('Première personne du couple')
        .setRequired(false))
    .addUserOption(option => option.setName('personne2')
        .setDescription('Deuxième personne du couple')
        .setRequired(false));

/**
 * Télécharge et redimensionne un avatar avec cache
 */
async function getProcessedAvatar(user: User, size: number): Promise<Buffer> {
    const cacheKey = `${user.id}-${user.avatar}`;
    const cached = avatarCache.get(cacheKey);
    
    // Retourner depuis le cache si valide
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.buffer;
    }
    
    // Télécharger en taille réduite (128px suffit pour un affichage 150px)
    const avatarURL = user.displayAvatarURL({ size: 128, extension: 'png' });
    const response = await axios.get(avatarURL, { responseType: 'arraybuffer' });
    
    // Redimensionner
    const buffer = await sharp(Buffer.from(response.data), { animated: false })
        .resize(size, size, { fit: 'cover' })
        .toBuffer();
    
    // Mettre en cache
    avatarCache.set(cacheKey, { buffer, timestamp: Date.now() });
    
    // Nettoyer les anciennes entrées du cache (limite à 100)
    if (avatarCache.size > 100) {
        const oldestKey = avatarCache.keys().next().value;
        if (oldestKey) avatarCache.delete(oldestKey);
    }
    
    return buffer;
}

async function generateCoupleImage(user1: User, user2: User): Promise<Buffer> {
    try {
        console.log(`[COUPLE] Génération d'image pour ${user1.username} et ${user2.username}...`);
        
        const canvasWidth = 600;
        const canvasHeight = 200;
        const avatarSize = 150;
        const padding = 15;

        // Télécharger les avatars en parallèle (avec cache)
        console.log(`[COUPLE] Téléchargement...`);
        const [avatar1Buffer, avatar2Buffer] = await Promise.all([
            getProcessedAvatar(user1, avatarSize),
            getProcessedAvatar(user2, avatarSize)
        ]);

        // Position avatars
        const avatar1X = padding;
        const avatar1Y = (canvasHeight - avatarSize) / 2;
        const avatar2X = canvasWidth - padding - avatarSize;
        const avatar2Y = (canvasHeight - avatarSize) / 2;

        // Create larger red heart SVG
        const heartSvg = Buffer.from(
            `<svg width="110" height="110" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <path d="M25,45 C25,45 5,30 5,20 C5,12 10,8 15,8 C20,8 25,12 25,12 C25,12 30,8 35,8 C40,8 45,12 45,20 C45,30 25,45 25,45 Z" fill="#ff1744"/>
            </svg>`
        );

        // Create the final image (WebP pour réduire la taille ~60%)
        const buffer = await sharp({
            create: {
                width: canvasWidth,
                height: canvasHeight,
                channels: 3,
                background: { r: 26, g: 26, b: 46 }
            }
        })
            .composite([
                { input: avatar1Buffer, left: avatar1X, top: avatar1Y },
                { input: avatar2Buffer, left: avatar2X, top: avatar2Y },
                {
                    input: heartSvg,
                    left: Math.floor(canvasWidth / 2 - 55),
                    top: Math.floor(canvasHeight / 2 - 55)
                }
            ])
            .webp({ quality: 85 }) // WebP avec qualité 85% (bon compromis)
            .toBuffer();

        console.log(`[COUPLE] ✅ Générée (${buffer.length} bytes, ~${(buffer.length / 1024).toFixed(1)} Ko)`);
        return buffer;
    } catch (error) {
        console.error('[COUPLE] Erreur lors de la génération:', error);
        throw error;
    }
}



export async function execute(interaction: CommandInteraction) {
    try {
        console.log(`[COUPLE] Commande exécutée par ${interaction.user.username}`);
        await interaction.deferReply();

        let user1 = interaction.options.getUser('personne1');
        let user2 = interaction.options.getUser('personne2');

        // If users are not provided, pick random users from the guild
        if (!user1 || !user2) {
            console.log(`[COUPLE] Sélection aléatoire des utilisateurs...`);
            const guild = interaction.guild;
            if (!guild) {
                await interaction.editReply('❌ Cette commande ne peut être utilisée que dans un serveur');
                return;
            }

            // Get members from cache + voice/presences
            let members = guild.members.cache;
            
            // Try to get from presences if cache is empty
            if (members.size < 2 && guild.presences) {
                members = guild.presences.cache.mapValues(p => p.member).filter(m => m !== null);
            }
            
            // Filter out bots
            const nonBotMembers = members.filter(m => m && !m.user.bot);

            if (nonBotMembers.size < 2) {
                await interaction.editReply(
                    '❌ Pas assez de membres en cache. Veuillez spécifier deux utilisateurs avec `/couple @user1 @user2`'
                );
                return;
            }

            // Pick random members
            const membersArray = Array.from(nonBotMembers.values()).filter(m => m !== null);
            
            if (!user1 && membersArray.length > 0) {
                const randomIndex1 = Math.floor(Math.random() * membersArray.length);
                user1 = membersArray[randomIndex1].user;
                console.log(`[COUPLE] Utilisateur 1 aléatoire: ${user1.username}`);
            }

            if (!user2 && membersArray.length > 0) {
                let randomIndex2 = Math.floor(Math.random() * membersArray.length);
                // Make sure we don't pick the same user twice
                while (user1 && membersArray[randomIndex2].user.id === user1.id && membersArray.length > 1) {
                    randomIndex2 = Math.floor(Math.random() * membersArray.length);
                }
                user2 = membersArray[randomIndex2].user;
                console.log(`[COUPLE] Utilisateur 2 aléatoire: ${user2.username}`);
            }
        }

        // Check if both users are the same
        if (user1.id === user2.id) {
            await interaction.editReply('❌ Vous ne pouvez pas créer un couple avec la même personne');
            return;
        }

        // Generate the couple image
        const coupleImage = await generateCoupleImage(user1, user2);
        const attachment = new AttachmentBuilder(coupleImage, { name: 'couple.webp' });

        // Random descriptions
        const descriptions = [
            `C'est magique entre ces deux là ! ✨`,
            `Amour vrai détecté 💕`,
            `Quel couple adorable ! 😍`,
            `Faits pour être ensemble 💞`,
            `L'amour est dans l'air 🥰`,
            `Une belle histoire d'amour commence ! 📖✨`,
            `Coup de foudre ! ⚡❤️`,
            `Destinés l'un à l'autre 🌟`,
            `Ils sont mignons ensemble ! 😊💕`,
            `Voilà qui fait rêver ! 🌹`,
            `C'est la vraie love 💯`,
            `Parfait ensemble ! 👌💗`
        ];
        const randomDescription = descriptions[Math.floor(Math.random() * descriptions.length)];

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#ff1744')
            .setTitle(`❤️ Amour entre ${user1.username} et ${user2.username}`)
            .setDescription(randomDescription)
            .setImage('attachment://couple.webp')
            .setFooter({
            text: 'Demandé par ' + interaction.user.username,
            iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
     })
            .setTimestamp();

        console.log(`[COUPLE] Envoi de la réponse...`);
        await interaction.editReply({
            embeds: [embed],
            files: [attachment]
        });
        console.log(`[COUPLE] ✅ Commande exécutée avec succès`);
    } catch (error) {
        console.error('[COUPLE] ❌ Erreur:', error);
        await interaction.editReply('❌ Une erreur est survenue lors de la génération du couple');
    }
}
