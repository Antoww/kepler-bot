import { Client, EmbedBuilder, TextChannel } from 'discord.js';
import { getBirthdaysForDate, getBirthdayChannel } from '../../database/db.ts';
import { isNetworkError } from '../../utils/retryHelper.ts';

export class BirthdayManager {
    private client: Client;
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(client: Client) {
        this.client = client;
    }

    // Démarrer la vérification automatique des anniversaires
    public startBirthdayCheck(): void {
        // Vérifier tous les jours à 00:00
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeUntilMidnight = tomorrow.getTime() - now.getTime();

        // Première vérification au prochain minuit
        setTimeout(() => {
            this.checkBirthdays();
            // Puis vérifier toutes les 24 heures
            this.checkInterval = setInterval(() => {
                this.checkBirthdays();
            }, 24 * 60 * 60 * 1000); // 24 heures
        }, timeUntilMidnight);
    }

    // Arrêter la vérification automatique
    public stopBirthdayCheck(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // Vérifier les anniversaires du jour
    private async checkBirthdays(): Promise<void> {
        try {
            const today = new Date();
            const day = today.getDate();
            const month = today.getMonth() + 1; // getMonth() retourne 0-11

            console.log(`🎂 Vérification des anniversaires pour le ${day}/${month}`);

            // Récupérer tous les serveurs du bot
            for (const guild of this.client.guilds.cache.values()) {
                try {
                    // Récupérer les anniversaires pour cette date dans ce serveur
                    const birthdays = await getBirthdaysForDate(guild.id, day, month);
                    
                    if (birthdays.length === 0) continue;

                    // Récupérer le canal d'anniversaires configuré
                    const birthdayChannelId = await getBirthdayChannel(guild.id);
                    
                    if (!birthdayChannelId) {
                        console.log(`Aucun canal d'anniversaires configuré pour le serveur ${guild.name}`);
                        continue;
                    }

                    const channel = await guild.channels.fetch(birthdayChannelId);
                    if (!channel || !channel.isTextBased()) {
                        console.log(`Canal d'anniversaires invalide pour le serveur ${guild.name}`);
                        continue;
                    }

                    // Envoyer un message pour chaque anniversaire
                    for (const birthday of birthdays) {
                        try {
                            const user = await this.client.users.fetch(birthday.user_id);
                            await this.sendBirthdayMessage(channel as TextChannel, user, birthday);
                        } catch (error) {
                            console.error(`Erreur lors de l'envoi de l'anniversaire pour l'utilisateur ${birthday.user_id}:`, error);
                        }
                    }
                } catch (error) {
                    // Distinguer les erreurs réseau des autres erreurs
                    if (isNetworkError(error)) {
                        console.warn(`⚠️ Erreur réseau lors de la vérification des anniversaires pour le serveur ${guild.name} (sera réessayé):`, (error as Error).message);
                    } else {
                        console.error(`Erreur lors de la vérification des anniversaires pour le serveur ${guild.name}:`, error);
                    }
                }
            }
        } catch (error) {
            // Erreur générale
            if (isNetworkError(error)) {
                console.warn('⚠️ Erreur réseau lors de la vérification générale des anniversaires (sera réessayé):', (error as Error).message);
            } else {
                console.error('Erreur lors de la vérification générale des anniversaires:', error);
            }
        }
    }

    // Envoyer un message d'anniversaire
    private async sendBirthdayMessage(channel: TextChannel, user: any, birthday: any): Promise<void> {
        // Calculer l'âge si l'année de naissance est fournie
        let ageText = '';
        if (birthday.birth_year) {
            const today = new Date();
            const age = today.getFullYear() - birthday.birth_year;
            ageText = ` Il/elle fête ses ${age} ans ! 🎂`;
        }

        const embed = new EmbedBuilder()
            .setAuthor({ 
                name: this.client.user?.username, 
                iconURL: this.client.user?.displayAvatarURL({ forceStatic: false }) 
            })
            .setColor('#FF69B4')
            .setTitle('🎉 Joyeux Anniversaire !')
            .setDescription(`Aujourd'hui, c'est l'anniversaire de **${user.username}** !${ageText}`)
            .addFields(
                { name: '🎁 Célébrons ensemble !', value: 'Souhaitons-lui une excellente journée remplie de joie et de bonheur !', inline: false },
                { name: '🎈 Message', value: `Joyeux anniversaire <@${user.id}> ! 🎂🎉`, inline: false }
            )
            .setThumbnail(user.displayAvatarURL({ forceStatic: false }))
            .setFooter({
                text: 'Système automatique d\'anniversaires',
                iconURL: this.client.user?.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();

        await channel.send({ embeds: [embed] });
        console.log(`🎂 Message d'anniversaire envoyé pour ${user.username} dans ${channel.guild.name}`);
    }

    // Méthode pour tester manuellement le système
    public async testBirthdayCheck(guildId: string, day: number, month: number): Promise<void> {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) {
                console.log('Serveur non trouvé');
                return;
            }

            const birthdays = await getBirthdaysForDate(guildId, day, month);
            console.log(`Anniversaires trouvés pour le ${day}/${month}:`, birthdays.length);

            if (birthdays.length === 0) {
                console.log('Aucun anniversaire trouvé pour cette date');
                return;
            }

            const birthdayChannelId = await getBirthdayChannel(guildId);
            if (!birthdayChannelId) {
                console.log('Aucun canal d\'anniversaires configuré');
                return;
            }

            const channel = await guild.channels.fetch(birthdayChannelId);
            if (!channel || !channel.isTextBased()) {
                console.log('Canal d\'anniversaires invalide');
                return;
            }

            for (const birthday of birthdays) {
                const user = await this.client.users.fetch(birthday.user_id);
                await this.sendBirthdayMessage(channel as TextChannel, user, birthday);
            }
        } catch (error) {
            console.error('Erreur lors du test:', error);
        }
    }
}
