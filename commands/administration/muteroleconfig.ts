import { CommandInteraction, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, Role } from 'discord.js';
import { updateMuteRole } from '../../database/db.ts';

export const data = new SlashCommandBuilder()
    .setName('muteroleconfig')
    .setDescription('Configure le rôle de mute du serveur')
    .addSubcommand(subcommand =>
        subcommand
            .setName('set')
            .setDescription('Définir le rôle de mute')
            .addRoleOption(option => option.setName('role')
                .setDescription('Le rôle à utiliser pour les mutes')
                .setRequired(true)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Créer automatiquement un rôle de mute')
            .addStringOption(option => option.setName('nom')
                .setDescription('Le nom du rôle de mute à créer')
                .setRequired(false)))
    .addSubcommand(subcommand =>
        subcommand
            .setName('disable')
            .setDescription('Désactiver le rôle de mute (utiliser timeout Discord)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply('Cette commande ne peut être utilisée que sur un serveur.');
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    try {
        switch (subcommand) {
            case 'set': {
                await interaction.deferReply();
                
                const role = interaction.options.getRole('role') as Role;
                
                if (!role) {
                    await interaction.editReply('Rôle invalide.');
                    return;
                }

                // Vérifier que le rôle existe et est accessible
                if (!interaction.guild.roles.cache.has(role.id)) {
                    await interaction.editReply('❌ Ce rôle n\'existe pas ou n\'est pas accessible.');
                    return;
                }

                // Vérifier que le bot peut gérer ce rôle
                const botMember = interaction.guild.members.me;
                if (!botMember || role.position >= botMember.roles.highest.position) {
                    await interaction.editReply('❌ Je ne peux pas gérer ce rôle car il est égal ou supérieur à mon rôle le plus élevé.');
                    return;
                }

                // Sauvegarder la configuration
                await updateMuteRole(interaction.guild.id, role.id);

                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: interaction.client.user?.username, 
                        iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
                    })
                    .setColor('#ff9900')
                    .setTitle('🔇 Rôle de mute configuré')
                    .setDescription(`Le rôle ${role} sera maintenant utilisé pour les mutes`)
                    .addFields(
                        { name: '📋 Rôle', value: `${role.name} (${role.id})`, inline: true },
                        { name: '🎨 Couleur', value: role.hexColor || '#000000', inline: true },
                        { name: '👥 Membres', value: role.members.size.toString(), inline: true }
                    )
                    .setFooter({
                        text: 'Demandé par ' + interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'create': {
                await interaction.deferReply();
                
                const roleName = interaction.options.getString('nom') || 'Muted';

                // Créer le rôle de mute
                const muteRole = await interaction.guild.roles.create({
                    name: roleName,
                    color: '#818181', // Gris
                    reason: `Rôle de mute créé par ${interaction.user.tag}`,
                    permissions: []
                });

                // Configurer les permissions du rôle dans tous les canaux
                const channels = interaction.guild.channels.cache;
                let successCount = 0;
                let totalCount = 0;

                for (const [channelId, channel] of channels) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        totalCount++;
                        try {
                            await channel.permissionOverwrites.create(muteRole, {
                                SendMessages: false,
                                AddReactions: false,
                                Speak: false,
                                Stream: false,
                                UseApplicationCommands: false,
                                CreatePublicThreads: false,
                                CreatePrivateThreads: false,
                                SendMessagesInThreads: false
                            });
                            successCount++;
                        } catch (error) {
                            console.error(`Erreur lors de la configuration du canal ${channel.name}:`, error);
                        }
                    }
                }

                // Sauvegarder la configuration
                await updateMuteRole(interaction.guild.id, muteRole.id);

                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: interaction.client.user?.username, 
                        iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
                    })
                    .setColor('#00ff00')
                    .setTitle('✅ Rôle de mute créé et configuré')
                    .setDescription(`Le rôle ${muteRole} a été créé et configuré pour tous les canaux`)
                    .addFields(
                        { name: '📋 Rôle créé', value: `${muteRole.name} (${muteRole.id})`, inline: true },
                        { name: '🔧 Canaux configurés', value: `${successCount}/${totalCount}`, inline: true },
                        { name: '🎨 Couleur', value: muteRole.hexColor || '#818181', inline: true }
                    )
                    .setFooter({
                        text: 'Demandé par ' + interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                    })
                    .setTimestamp();

                if (successCount < totalCount) {
                    embed.addFields({
                        name: '⚠️ Attention',
                        value: `Certains canaux n'ont pas pu être configurés. Vérifiez les permissions manuellement.`,
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
                break;
            }

            case 'disable': {
                await interaction.deferReply();
                
                // Supprimer la configuration du rôle de mute
                await updateMuteRole(interaction.guild.id, '');

                const embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: interaction.client.user?.username, 
                        iconURL: interaction.client.user?.displayAvatarURL({ forceStatic: false }) 
                    })
                    .setColor('#ffaa00')
                    .setTitle('🔄 Rôle de mute désactivé')
                    .setDescription('Le système utilisera maintenant le timeout Discord natif pour les mutes')
                    .addFields({
                        name: 'ℹ️ Information',
                        value: 'Les futures commandes `/mute` utiliseront le système de timeout de Discord (durée limitée à 28 jours)',
                        inline: false
                    })
                    .setFooter({
                        text: 'Demandé par ' + interaction.user.username,
                        iconURL: interaction.user.displayAvatarURL({ forceStatic: false })
                    })
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                break;
            }
        }
    } catch (error) {
        console.error('Erreur lors de la configuration du rôle de mute:', error);
        
        // Vérifier si on peut encore répondre
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply('❌ Une erreur est survenue lors de la configuration du rôle de mute.');
        } else {
            await interaction.reply('❌ Une erreur est survenue lors de la configuration du rôle de mute.');
        }
    }
}
