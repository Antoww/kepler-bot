import {
    type CommandInteraction,
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder
} from 'discord.js';
import { supabase } from '../../database/supabase.ts';

export const data = new SlashCommandBuilder()
    .setName('count')
    .setDescription('Gère le mini-jeu de comptage')
    .addSubcommand(subcommand =>
        subcommand
            .setName('channel')
            .setDescription('Définit le salon où se déroule le comptage')
            .addChannelOption(option =>
                option
                    .setName('canal')
                    .setDescription('Le salon pour le comptage')
                    .setRequired(true)
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('stop')
            .setDescription('Arrête le jeu de comptage')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guild) {
        await interaction.reply({ content: '❌ Cette commande ne peut être utilisée que sur un serveur.', ephemeral: true });
        return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'channel') {
        await handleChannelCommand(interaction);
    } else if (subcommand === 'stop') {
        await handleStopCommand(interaction);
    }
}

async function handleChannelCommand(interaction: CommandInteraction) {
    if (!interaction.guild) return;

    const channel = interaction.options.getChannel('canal', true);

    try {
        // Récupérer ou créer la configuration de comptage
        const { data: existingConfig } = await supabase
            .from('count_config')
            .select('*')
            .eq('guild_id', interaction.guild.id)
            .single();

        if (existingConfig) {
            // Mettre à jour la configuration
            await supabase
                .from('count_config')
                .update({
                    channel_id: channel.id,
                    current_count: 0,
                    last_user_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('guild_id', interaction.guild.id);
        } else {
            // Créer une nouvelle configuration
            await supabase
                .from('count_config')
                .insert({
                    guild_id: interaction.guild.id,
                    channel_id: channel.id,
                    current_count: 0,
                    last_user_id: null
                });
        }

        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('✅ Comptage activé')
            .setDescription(`Le jeu de comptage a été configuré dans ${channel.toString()}`)
            .addFields(
                { name: 'Départ', value: '0', inline: true },
                { name: 'Comment jouer', value: 'Comptez chacun votre tour. Vous ne pouvez pas compter deux fois de suite!', inline: false }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Envoyer un message dans le salon de comptage
        try {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setTitle('🎮 Jeu de Comptage')
                        .setDescription('Bienvenue dans le jeu de comptage! Comptez chacun votre tour en envoyant un nombre.\n\n**Règles:**\n• Vous ne pouvez pas compter deux fois de suite\n• Le prochain nombre doit être supérieur d\'1 au précédent\n• Si vous vous trompez, votre message sera supprimé\n\n**Nombre actuel: 0**')
                        .setTimestamp()
                ]
            });
        } catch (error) {
            console.error('Erreur lors de l\'envoi du message dans le salon:', error);
        }
    } catch (error) {
        console.error('Erreur lors de la configuration du comptage:', error);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de la configuration.', ephemeral: true });
    }
}

async function handleStopCommand(interaction: CommandInteraction) {
    if (!interaction.guild) return;

    try {
        const { data: config } = await supabase
            .from('count_config')
            .select('*')
            .eq('guild_id', interaction.guild.id)
            .single();

        if (!config) {
            await interaction.reply({ content: '❌ Aucun jeu de comptage n\'est actif sur ce serveur.', ephemeral: true });
            return;
        }

        // Supprimer la configuration
        await supabase
            .from('count_config')
            .delete()
            .eq('guild_id', interaction.guild.id);

        const embed = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle('⛔ Comptage arrêté')
            .setDescription(`Le jeu de comptage a été arrêté. Le score final était: **${config.current_count}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Erreur lors de l\'arrêt du comptage:', error);
        await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'arrêt du jeu.', ephemeral: true });
    }
}
