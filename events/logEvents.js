const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configFilePath = path.join(__dirname, '../database/confserver.json');

let config = {};

// Charger la configuration depuis un fichier
if (fs.existsSync(configFilePath)) {
    config = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

module.exports = (client) => {
    client.on('guildBanAdd', async (ban) => {
        const guildId = ban.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = ban.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Utilisateur Banni')
                    .setDescription(`L'utilisateur ${ban.user.tag} a été banni.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    client.on('guildBanRemove', async (ban) => {
        const guildId = ban.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = ban.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Utilisateur Débanni')
                    .setDescription(`L'utilisateur ${ban.user.tag} a été débanni.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    client.on('channelCreate', async (channel) => {
        const guildId = channel.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = channel.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Salon Créé')
                    .setDescription(`Le salon ${channel.name} a été créé.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    client.on('channelDelete', async (channel) => {
        const guildId = channel.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = channel.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Salon Supprimé')
                    .setDescription(`Le salon ${channel.name} a été supprimé.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    client.on('channelUpdate', async (oldChannel, newChannel) => {
        const guildId = newChannel.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = newChannel.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('Salon Modifié')
                    .setDescription(`Le salon ${oldChannel.name} a été modifié en ${newChannel.name}.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    client.on('guildMemberAdd', async (member) => {
        const guildId = member.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = member.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('Nouveau Membre')
                    .setDescription(`L'utilisateur ${member.user.tag} a rejoint le serveur.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    client.on('guildMemberRemove', async (member) => {
        const guildId = member.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = member.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Membre Parti')
                    .setDescription(`L'utilisateur ${member.user.tag} a quitté le serveur.`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        }
    });
};