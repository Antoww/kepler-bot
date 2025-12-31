import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, type User } from 'discord.js';
import Jimp from 'jimp';
import axios from 'axios';

export const data = new SlashCommandBuilder()
    .setName('couple')
    .setDescription('Crée un couple avec deux membres du serveur')
    .addUserOption(option => option.setName('personne1')
        .setDescription('Première personne du couple')
        .setRequired(false))
    .addUserOption(option => option.setName('personne2')
        .setDescription('Deuxième personne du couple')
        .setRequired(false));

async function generateCoupleImage(user1: User, user2: User): Promise<Buffer> {
    try {
        console.log(`[COUPLE] Génération d'image pour ${user1.username} et ${user2.username}...`);
        
        // Image dimensions
        const canvasWidth = 600;
        const canvasHeight = 200;
        const avatarSize = 140;
        const padding = 20;

        // Get avatars URLs
        const avatar1URL = user1.displayAvatarURL({ size: 512, extension: 'png' });
        const avatar2URL = user2.displayAvatarURL({ size: 512, extension: 'png' });

        // Download avatars in parallel + create base image in parallel
        console.log(`[COUPLE] Téléchargement & création...`);
        const [avatar1Data, avatar2Data, image] = await Promise.all([
            axios.get(avatar1URL, { responseType: 'arraybuffer' }),
            axios.get(avatar2URL, { responseType: 'arraybuffer' }),
            (async () => {
                let img = new Jimp({ width: canvasWidth, height: canvasHeight });
                img.fillColor({ r: 26, g: 26, b: 46, a: 255 });
                return img;
            })()
        ]);

        // Load avatars in parallel
        const [avatar1, avatar2] = await Promise.all([
            (async () => {
                const av = new Jimp({ data: Buffer.from(avatar1Data.data) });
                av.resize({ w: avatarSize, h: avatarSize });
                av.circle();
                return av;
            })(),
            (async () => {
                const av = new Jimp({ data: Buffer.from(avatar2Data.data) });
                av.resize({ w: avatarSize, h: avatarSize });
                av.circle();
                return av;
            })()
        ]);

        // Position and composite avatars
        const avatar1X = padding;
        const avatar1Y = (canvasHeight - avatarSize) / 2;
        const avatar2X = canvasWidth - padding - avatarSize;
        const avatar2Y = (canvasHeight - avatarSize) / 2;

        image.composite({ source: avatar1, x: avatar1X, y: avatar1Y });
        image.composite({ source: avatar2, x: avatar2X, y: avatar2Y });

        // Draw heart
        drawHeartOptimized(image, canvasWidth / 2, canvasHeight / 2, 40);

        // Convert to PNG
        const buffer = await image.png().toBuffer();
        console.log(`[COUPLE] ✅ Générée (${buffer.length} bytes)`);

        return buffer;
    } catch (error) {
        console.error('[COUPLE] Erreur lors de la génération:', error);
        throw error;
    }
}

function drawHeartOptimized(image: Jimp, x: number, y: number, size: number) {
    // Simple red circle instead of complex heart shape to avoid blocking
    const redColor = 0xff1744ff;
    const radius = Math.floor(size / 2);

    // Draw simple circle for heart (fast and non-blocking)
    for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
            if (i * i + j * j <= radius * radius) {
                const px = Math.floor(x + i);
                const py = Math.floor(y + j);
                if (px >= 0 && px < image.bitmap.width && py >= 0 && py < image.bitmap.height) {
                    image.setPixelColor(redColor, px, py);
                }
            }
        }
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

            // Fetch all members
            const members = await guild.members.fetch();
            
            // Filter out bots
            const nonBotMembers = members.filter(m => !m.user.bot);

            if (nonBotMembers.size < 2) {
                await interaction.editReply('❌ Il faut au moins 2 membres non-bots sur le serveur');
                return;
            }

            // Pick random members
            const membersArray = Array.from(nonBotMembers.values());
            
            if (!user1) {
                const randomIndex1 = Math.floor(Math.random() * membersArray.length);
                user1 = membersArray[randomIndex1].user;
                console.log(`[COUPLE] Utilisateur 1 aléatoire: ${user1.username}`);
            }

            if (!user2) {
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
        const attachment = new AttachmentBuilder(coupleImage, { name: 'couple.png' });

        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#ff1744')
            .setTitle(`❤️ Amour entre ${user1.username} et ${user2.username}`)
            .setDescription(`C'est magique entre ces deux là ! ✨`)
            .setImage('attachment://couple.png')
            .setFooter({ text: 'Couple Generator' })
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
