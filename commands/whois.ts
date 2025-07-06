import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import whois from 'whois-json';

export const data = new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Donne des informations WHOIS détaillées sur un nom de domaine.')
    .addStringOption(option => option.setName('domaine')
        .setDescription('Le nom de domaine à analyser (ex: google.com)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(253));

export async function execute(interaction: CommandInteraction) {
    const domaine = interaction.options.get('domaine')?.value as string;
    
    // Validation basique du format du domaine
    const domaineRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domaineRegex.test(domaine)) {
        return await interaction.reply({
            content: '❌ Format de domaine invalide. Veuillez entrer un nom de domaine valide (ex: google.com)',
            flags: MessageFlags.Ephemeral
        });
    }

    await interaction.deferReply();

    try {
        const whoisData = await whois(domaine);
        
        // Vérification si les données sont valides
        if (!whoisData || Object.keys(whoisData).length === 0) {
            return await interaction.editReply({
                content: `❌ Impossible de récupérer les informations WHOIS pour **${domaine}**. Le domaine pourrait ne pas exister ou être protégé.`
            });
        }

        // Fonction pour formater les dates
        const formatDate = (dateString: string | undefined) => {
            if (!dateString) return 'Non disponible';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch {
                return dateString;
            }
        };

        // Fonction pour tronquer les longues chaînes
        const truncate = (str: string | undefined, maxLength: number = 50) => {
            if (!str) return 'Non disponible';
            return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
        };

        // Fonction pour formater les serveurs de noms
        const formatNameServers = (servers: string[] | string | undefined) => {
            if (!servers) return 'Non disponible';
            const serverArray = Array.isArray(servers) ? servers : [servers];
            return serverArray.length > 0 ? serverArray.slice(0, 3).join('\n') : 'Non disponible';
        };

        // Déterminer la couleur basée sur le statut
        const getStatusColor = (status: string | undefined) => {
            if (!status) return '#808080';
            const statusLower = status.toLowerCase();
            if (statusLower.includes('active') || statusLower.includes('ok')) return '#00ff00';
            if (statusLower.includes('pending') || statusLower.includes('hold')) return '#ffaa00';
            if (statusLower.includes('expired') || statusLower.includes('suspended')) return '#ff0000';
            return '#0099ff';
        };

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: `🔍 WHOIS - ${domaine}`, 
                iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor(getStatusColor(whoisData.status))
            .setTitle(`📋 Informations WHOIS`)
            .setDescription(`**Domaine analysé :** \`${domaine}\``)
            .addFields(
                { 
                    name: '🏢 **Registrar**', 
                    value: truncate(whoisData.registrar, 100) || 'Non disponible', 
                    inline: false 
                },
                { 
                    name: '📅 **Date de création**', 
                    value: formatDate(whoisData.creationDate), 
                    inline: true 
                },
                { 
                    name: '⏰ **Date d\'expiration**', 
                    value: formatDate(whoisData.expirationDate), 
                    inline: true 
                },
                { 
                    name: '🔄 **Dernière mise à jour**', 
                    value: formatDate(whoisData.updatedDate), 
                    inline: true 
                },
                { 
                    name: '📊 **Statut**', 
                    value: truncate(whoisData.status, 100) || 'Non disponible', 
                    inline: true 
                },
                { 
                    name: '🌐 **Serveurs de noms**', 
                    value: formatNameServers(whoisData.nameServers), 
                    inline: false 
                }
            )
            .setFooter({
                text: `Demandé par ${interaction.user.username} • ${new Date().toLocaleDateString('fr-FR')}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        // Ajouter des informations supplémentaires si disponibles
        if (whoisData.registrantOrganization || whoisData.registrantName) {
            embed.addFields({
                name: '👤 **Informations du registrant**',
                value: `**Organisation :** ${truncate(whoisData.registrantOrganization, 50) || 'Non disponible'}\n**Nom :** ${truncate(whoisData.registrantName, 50) || 'Non disponible'}`,
                inline: false
            });
        }

        if (whoisData.adminEmail || whoisData.registrantEmail) {
            embed.addFields({
                name: '📧 **Contact**',
                value: `**Email admin :** ${truncate(whoisData.adminEmail, 50) || 'Non disponible'}\n**Email registrant :** ${truncate(whoisData.registrantEmail, 50) || 'Non disponible'}`,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        console.error('Erreur WHOIS:', error);
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur lors de la récupération des informations')
            .setDescription(`Impossible de récupérer les informations WHOIS pour **${domaine}**.\n\n**Raisons possibles :**\n• Le domaine n'existe pas\n• Le domaine est protégé par la confidentialité\n• Problème de connexion au serveur WHOIS\n• Le domaine utilise un format non standard`)
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [errorEmbed] });
    }
}