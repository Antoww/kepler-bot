import { type Message, EmbedBuilder } from 'discord.js';
import { supabase } from '../../database/supabase.ts';

export class CountingManager {
    /**
     * Traite un message pour vérifier si c'est un comptage valide
     */
    static async handleMessage(message: Message): Promise<void> {
        if (!message.guild || message.author.bot) return;

        try {
            // Récupérer la configuration de comptage pour ce serveur
            const { data: config } = await supabase
                .from('count_config')
                .select('*')
                .eq('guild_id', message.guild.id)
                .single();

            if (!config || config.channel_id !== message.channel.id) {
                return; // Pas de comptage actif dans ce canal
            }

            // Vérifier si le message est un nombre
            const number = parseInt(message.content.trim());

            if (isNaN(number)) {
                // Ce n'est pas un nombre, ignorer
                return;
            }

            // Vérifier que le nombre est le suivant attendu
            const expectedNumber = config.current_count + 1;

            if (number !== expectedNumber) {
                // Mauvais nombre
                try {
                    await message.delete();
                } catch (error) {
                    console.error('Erreur lors de la suppression du message:', error);
                }

                // Envoyer un message d'erreur
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription(`❌ ${message.author.toString()} Le nombre attendu était **${expectedNumber}**, pas ${number}!`)
                    .setTimestamp();

                try {
                    const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
                    // Supprimer le message d'erreur après 3 secondes
                    setTimeout(() => errorMsg.delete().catch(() => {}), 3000);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du message d\'erreur:', error);
                }

                return;
            }

            // Vérifier que l'utilisateur n'a pas compté deux fois de suite
            if (config.last_user_id === message.author.id) {
                try {
                    await message.delete();
                } catch (error) {
                    console.error('Erreur lors de la suppression du message:', error);
                }

                // Envoyer un message d'erreur
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setDescription(`❌ ${message.author.toString()} Vous avez déjà compté! Attendez que quelqu'un d'autre compte.`)
                    .setTimestamp();

                try {
                    const errorMsg = await message.channel.send({ embeds: [errorEmbed] });
                    // Supprimer le message d'erreur après 3 secondes
                    setTimeout(() => errorMsg.delete().catch(() => {}), 3000);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du message d\'erreur:', error);
                }

                return;
            }

            // Comptage valide! Mettre à jour la configuration
            await supabase
                .from('count_config')
                .update({
                    current_count: number,
                    last_user_id: message.author.id,
                    updated_at: new Date().toISOString()
                })
                .eq('guild_id', message.guild.id);

            // Ajouter une réaction de succès
            try {
                await message.react('✅');
            } catch (error) {
                console.error('Erreur lors de l\'ajout de la réaction:', error);
            }

            // Envoyer un message de jalons si c'est un nombre rond ou important
            if (number % 10 === 0) {
                const milestoneEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setDescription(`🎉 Jalons! Nous avons atteint **${number}**! Bravo ${message.author.toString()}!`)
                    .setTimestamp();

                try {
                    const milestoneMsg = await message.channel.send({ embeds: [milestoneEmbed] });
                    // Supprimer le message après 5 secondes
                    setTimeout(() => milestoneMsg.delete().catch(() => {}), 5000);
                } catch (error) {
                    console.error('Erreur lors de l\'envoi du message de jalon:', error);
                }
            }
        } catch (error) {
            console.error('Erreur lors du traitement du comptage:', error);
        }
    }
}

export default CountingManager;
