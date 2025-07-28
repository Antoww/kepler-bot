import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('minecraft-uuid')
    .setDescription('Récupère l\'UUID d\'un joueur Minecraft')
    .addStringOption(option => option.setName('pseudo')
        .setDescription('Le pseudo du joueur Minecraft')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const username = interaction.options.getString('pseudo')!;

    try {
        const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`);
        
        if (!response.ok) {
            await interaction.reply(`Joueur **${username}** introuvable.`);
            return;
        }

        const data = await response.json();
        const uuid = data.id;
        const formattedUuid = `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20)}`;

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#00ff00')
            .setTitle('🎮 Informations Minecraft')
            .addFields(
                { name: '👤 Pseudo', value: data.name, inline: true },
                { name: '🆔 UUID', value: formattedUuid, inline: true },
                { name: '🆔 UUID (sans tirets)', value: uuid, inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'UUID:', error);
        await interaction.reply('Erreur lors de la récupération de l\'UUID. Veuillez réessayer.');
    }
} 