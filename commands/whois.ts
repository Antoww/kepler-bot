import { type CommandInteraction, SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import axios from 'axios';

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
        try {
            return await interaction.reply({
                content: '❌ Format de domaine invalide. Veuillez entrer un nom de domaine valide (ex: google.com)',
                flags: MessageFlags.Ephemeral
            });
        } catch (error) {
            console.error('Erreur lors de la réponse:', error);
            return;
        }
    }

    try {
        await interaction.deferReply();
    } catch (error) {
        console.error('Erreur lors du deferReply:', error);
        return;
    }

    // Fonctions utilitaires
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

    const truncate = (str: string | undefined, maxLength: number = 50) => {
        if (!str) return 'Non disponible';
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    };

    const formatNameServers = (servers: string[] | string | undefined) => {
        if (!servers) return 'Non disponible';
        const serverArray = Array.isArray(servers) ? servers : [servers];
        return serverArray.length > 0 ? serverArray.slice(0, 3).join('\n') : 'Non disponible';
    };

    const getStatusColor = (status: string | undefined) => {
        if (!status) return '#808080';
        const statusLower = status.toLowerCase();
        if (statusLower.includes('active') || statusLower.includes('ok')) return '#00ff00';
        if (statusLower.includes('pending') || statusLower.includes('hold')) return '#ffaa00';
        if (statusLower.includes('expired') || statusLower.includes('suspended')) return '#ff0000';
        return '#0099ff';
    };

    try {
        // Utilisation d'une API WHOIS publique
        const response = await axios.get(`https://whois.freeaiapi.xyz/api/v1/whois/${domaine}`, {
            timeout: 10000,
            headers: {
                'User-Agent': 'KeplerBot/1.0'
            }
        });

        const whoisData = response.data;
        
        // Vérification si les données sont valides
        if (!whoisData || whoisData.error) {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Aucune information trouvée')
                .setDescription(`Impossible de récupérer les informations WHOIS pour **${domaine}**.\n\n**Raisons possibles :**\n• Le domaine n'existe pas\n• Le domaine est protégé par la confidentialité\n• Le domaine utilise un format non standard`)
                .setFooter({
                    text: `Demandé par ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
            return;
        }

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
        
        // Si l'API échoue, essayer une approche alternative avec une autre API
        try {
            const alternativeResponse = await axios.get(`https://api.domainsdb.info/v1/domains/search?domain=${domaine}`, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'KeplerBot/1.0'
                }
            });

            if (alternativeResponse.data && alternativeResponse.data.domains && alternativeResponse.data.domains.length > 0) {
                const domainInfo = alternativeResponse.data.domains[0];
                
                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `🔍 WHOIS - ${domaine}`, 
                        iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
                    })
                    .setColor('#0099ff')
                    .setTitle(`📋 Informations de domaine`)
                    .setDescription(`**Domaine analysé :** \`${domaine}\``)
                    .addFields(
                        { 
                            name: '🏢 **Registrar**', 
                            value: truncate(domainInfo.registrar, 100) || 'Non disponible', 
                            inline: false 
                        },
                        { 
                            name: '📅 **Date de création**', 
                            value: formatDate(domainInfo.create_date), 
                            inline: true 
                        },
                        { 
                            name: '⏰ **Date d\'expiration**', 
                            value: formatDate(domainInfo.expiry_date), 
                            inline: true 
                        },
                        { 
                            name: '🌍 **Pays**', 
                            value: domainInfo.country || 'Non disponible', 
                            inline: true 
                        }
                    )
                    .setFooter({
                        text: `Demandé par ${interaction.user.username} • Données alternatives`,
                        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }
        } catch (alternativeError) {
            console.error('Erreur API alternative:', alternativeError);
        }
        
        const errorEmbed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('❌ Erreur lors de la récupération des informations')
            .setDescription(`Impossible de récupérer les informations WHOIS pour **${domaine}**.\n\n**Raisons possibles :**\n• Le domaine n'existe pas\n• Le domaine est protégé par la confidentialité\n• Problème de connexion aux serveurs WHOIS\n• Le domaine utilise un format non standard\n• Erreur technique temporaire`)
            .setFooter({
                text: `Demandé par ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        try {
            await interaction.editReply({ embeds: [errorEmbed] });
        } catch (editError) {
            console.error('Erreur lors de l\'édition de la réponse:', editError);
            // Si l'édition échoue, essayer d'envoyer une nouvelle réponse
            try {
                await interaction.followUp({ 
                    content: '❌ Erreur lors de la récupération des informations WHOIS.',
                    flags: MessageFlags.Ephemeral 
                });
            } catch (followUpError) {
                console.error('Erreur lors du followUp:', followUpError);
            }
        }
    }
}