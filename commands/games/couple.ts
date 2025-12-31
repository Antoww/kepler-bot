import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, type User } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';

export const data = new SlashCommandBuilder()
    .setName('couple')
    .setDescription('Crée un couple avec deux utilisateurs')
    .addUserOption(option => option.setName('personne1')
        .setDescription('Première personne du couple')
        .setRequired(false))
    .addUserOption(option => option.setName('personne2')
        .setDescription('Deuxième personne du couple')
        .setRequired(false));

async function generateCoupleImage(user1: User, user2: User): Promise<Buffer> {
    const canvas = createCanvas(600, 200);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load avatars
    const avatar1URL = user1.displayAvatarURL({ size: 512, extension: 'png' });
    const avatar2URL = user2.displayAvatarURL({ size: 512, extension: 'png' });

    try {
        const avatar1 = await loadImage(avatar1URL);
        const avatar2 = await loadImage(avatar2URL);

        // Draw avatars with circular clipping
        const avatarSize = 140;
        const padding = 20;

        // Avatar 1 (left)
        ctx.save();
        ctx.beginPath();
        ctx.arc(padding + avatarSize / 2, canvas.height / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar1, padding, canvas.height / 2 - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        // Avatar 2 (right)
        ctx.save();
        ctx.beginPath();
        ctx.arc(canvas.width - padding - avatarSize / 2, canvas.height / 2, avatarSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar2, canvas.width - padding - avatarSize, canvas.height / 2 - avatarSize / 2, avatarSize, avatarSize);
        ctx.restore();

        // Draw heart in the middle
        drawHeart(ctx, canvas.width / 2, canvas.height / 2, 40);

        return canvas.toBuffer('image/png');
    } catch (error) {
        console.error('Error generating couple image:', error);
        throw error;
    }
}

function drawHeart(ctx: any, x: number, y: number, size: number) {
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    
    const d = size;
    
    // Left bump
    ctx.bezierCurveTo(x - d/2, y - d/3, x - d, y - d/3, x - d, y + d/5);
    ctx.bezierCurveTo(x - d, y + d/2, x, y + d, x, y + d);
    
    // Right bump
    ctx.bezierCurveTo(x, y + d, x + d, y + d/2, x + d, y + d/5);
    ctx.bezierCurveTo(x + d, y - d/3, x + d/2, y - d/3, x, y);
    
    ctx.closePath();
    ctx.fill();
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
