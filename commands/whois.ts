import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import whois from 'whois-json';

export const data = new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Donne des informations WHOIS sur un nom de domaine.')
    .addStringOption(option => option.setName('domaine')
        .setDescription('Le nom de domaine à analyser (ex: google.com)')
        .setRequired(true));

export async function execute(interaction: CommandInteraction) {
    const domaine = interaction.options.get('domaine')?.value as string;

    await interaction.deferReply();

    try {
        const whoisData = await whois(domaine);

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `🔍 WHOIS - ${domaine}`, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#0099ff')
            .setTitle(`📋 Informations WHOIS`)
            .setDescription(`**Domaine analysé :** \`${domaine}\``)
            .addFields(
                { 
                    name: '🏢 **Registrar**', 
                    value: whoisData.registrar || 'Non disponible', 
                    inline: true 
                },
                { 
                    name: '📅 **Date de création**', 
                    value: whoisData.creationDate || 'Non disponible', 
                    inline: true 
                },
                { 
                    name: '⏰ **Date d\'expiration**', 
                    value: whoisData.expirationDate || 'Non disponible', 
                    inline: true 
                },
                { 
                    name: '🔄 **Dernière mise à jour**', 
                    value: whoisData.updatedDate || 'Non disponible', 
                    inline: true 
                },
                { 
                    name: '📊 **Statut**', 
                    value: whoisData.status || 'Non disponible', 
                    inline: true 
                },
                { 
                    name: '🌐 **Serveurs de noms**', 
                    value: whoisData.nameServers ? (Array.isArray(whoisData.nameServers) ? whoisData.nameServers.join(', ') : whoisData.nameServers) : 'Non disponible', 
                    inline: false 
                }
            )
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur WHOIS:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur lors de la récupération des informations')
            .setDescription(`Impossible de récupérer les informations WHOIS pour **${domaine}**.\n\n**Raisons possibles :**\n• Le domaine n'existe pas\n• Le domaine est protégé par la confidentialité\n• Problème de connexion au serveur WHOIS`)
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}