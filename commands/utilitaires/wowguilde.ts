import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('wowguilde')
    .setDescription('Affiche les informations d\'une guilde World of Warcraft')
    .addStringOption(option => option.setName('serveur')
        .setDescription('Le nom du serveur')
        .setRequired(true))
    .addStringOption(option => option.setName('guilde')
        .setDescription('Le nom de la guilde')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const server = interaction.options.getString('serveur')!;
    const guild = interaction.options.getString('guilde')!;

    try {
        // Ici vous pouvez intégrer l'API Battle.net pour récupérer les vraies données
        // Pour l'instant, nous utilisons des données d'exemple
        
        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: interaction.client.user?.username, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#FFD700')
            .setTitle(`🏰 Guilde: ${guild}`)
            .setDescription(`Informations sur la guilde **${guild}** du serveur **${server}**`)
            .addFields(
                { name: '🌍 Serveur', value: server, inline: true },
                { name: '👥 Membres', value: '25/25', inline: true },
                { name: '🏆 Niveau', value: '25', inline: true },
                { name: '⚔️ Progression', value: 'Mythique +20', inline: true },
                { name: '📅 Création', value: '2023', inline: true },
                { name: '👑 Chef', value: 'NomDuChef', inline: true }
            )
            .setFooter({
                text: 'Demandé par ' + interaction.user.username,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de la récupération des informations de guilde:', error);
        await interaction.reply('Erreur lors de la récupération des informations de guilde. Veuillez réessayer.');
    }
} 