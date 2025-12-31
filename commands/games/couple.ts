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
        // Image dimensions
        const canvasWidth = 600;
        const canvasHeight = 200;
        const avatarSize = 140;
        const padding = 20;

        // Create base image with dark background
        const image = new Jimp({
            width: canvasWidth,
            height: canvasHeight,
            color: 0x1a1a2eff
        });

        // Get avatars
        const avatar1URL = user1.displayAvatarURL({ size: 512, extension: 'png' });
        const avatar2URL = user2.displayAvatarURL({ size: 512, extension: 'png' });

        // Download and process avatars
        const avatar1Data = await axios.get(avatar1URL, { responseType: 'arraybuffer' });
        const avatar2Data = await axios.get(avatar2URL, { responseType: 'arraybuffer' });

        const avatar1 = await Jimp.read(avatar1Data.data);
        const avatar2 = await Jimp.read(avatar2Data.data);

        // Resize avatars
        avatar1.resize({ w: avatarSize, h: avatarSize });
        avatar2.resize({ w: avatarSize, h: avatarSize });

        // Circularize avatars (create circular mask)
        avatar1.circle();
        avatar2.circle();

        // Position avatars
        const avatar1X = padding;
        const avatar1Y = (canvasHeight - avatarSize) / 2;
        const avatar2X = canvasWidth - padding - avatarSize;
        const avatar2Y = (canvasHeight - avatarSize) / 2;

        // Composite avatars on main image
        image.composite({
            source: avatar1,
            x: avatar1X,
            y: avatar1Y
        });

        image.composite({
            source: avatar2,
            x: avatar2X,
            y: avatar2Y
        });

        // Draw heart in the middle
        drawHeart(image, canvasWidth / 2, canvasHeight / 2, 40);

        return await image.png().toBuffer();
    } catch (error) {
        console.error('Error generating couple image:', error);
        throw error;
    }
}

function drawHeart(image: Jimp, x: number, y: number, size: number) {
    // Red heart color
    const redColor = 0xff1744ff;
    
    // Simple heart drawing using Jimp's scan method
    const d = size;
    
    // This creates a simple filled heart shape
    for (let i = -d; i <= d; i++) {
        for (let j = -d; j <= d; j++) {
            // Heart shape equation
            const heartX = i;
            const heartY = j;
            const xx = heartX / d;
            const yy = -heartY / d;
            
            // Heart curve formula
            const heart = Math.pow(xx * xx + (yy - Math.abs(xx)) * (yy - Math.abs(xx)), 0.5) - 1;
            
            if (heart <= 0) {
                const pixelX = Math.round(x + heartX);
                const pixelY = Math.round(y + heartY);
                
                if (pixelX >= 0 && pixelX < image.bitmap.width && pixelY >= 0 && pixelY < image.bitmap.height) {
                    image.setPixelColor(redColor, pixelX, pixelY);
                }
            }
        }
    }
}

export async function execute(interaction: CommandInteraction) {
    try {
        await interaction.deferReply();

        let user1 = interaction.options.getUser('personne1');
        let user2 = interaction.options.getUser('personne2');

        // If users are not provided, pick random users from the guild
        if (!user1 || !user2) {
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
            }

            if (!user2) {
                let randomIndex2 = Math.floor(Math.random() * membersArray.length);
                // Make sure we don't pick the same user twice
                while (user1 && membersArray[randomIndex2].user.id === user1.id && membersArray.length > 1) {
                    randomIndex2 = Math.floor(Math.random() * membersArray.length);
                }
                user2 = membersArray[randomIndex2].user;
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

        await interaction.editReply({
            embeds: [embed],
            files: [attachment]
        });
    } catch (error) {
        console.error(error);
        await interaction.editReply('❌ Une erreur est survenue lors de la génération du couple');
    }
}
