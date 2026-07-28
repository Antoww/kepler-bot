import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createKeplerEmbed } from '../utils/theme.ts';

const configFilePath = join(import.meta.dirname, '../database/confserver.json');

let config = {};

// Charger la configuration depuis un fichier
if (existsSync(configFilePath)) {
    config = JSON.parse(readFileSync(configFilePath, 'utf8'));
}

export default (client) => {
    // deno-lint-ignore require-await
    client.on('guildBanAdd', async (ban) => {
        const guildId = ban.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = ban.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('danger')
                    .setTitle('Utilisateur Banni')
                    .setDescription(`L'utilisateur ${ban.user.tag} a été banni.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    // deno-lint-ignore require-await
    client.on('guildBanRemove', async (ban) => {
        const guildId = ban.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = ban.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('success')
                    .setTitle('Utilisateur Débanni')
                    .setDescription(`L'utilisateur ${ban.user.tag} a été débanni.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    // deno-lint-ignore require-await
    client.on('channelCreate', async (channel) => {
        const guildId = channel.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = channel.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('success')
                    .setTitle('Salon Créé')
                    .setDescription(`Le salon ${channel.name} a été créé.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    // deno-lint-ignore require-await
    client.on('channelDelete', async (channel) => {
        const guildId = channel.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = channel.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('danger')
                    .setTitle('Salon Supprimé')
                    .setDescription(`Le salon ${channel.name} a été supprimé.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    // deno-lint-ignore require-await
    client.on('channelUpdate', async (oldChannel, newChannel) => {
        const guildId = newChannel.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = newChannel.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('warning')
                    .setTitle('Salon Modifié')
                    .setDescription(`Le salon ${oldChannel.name} a été modifié en ${newChannel.name}.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    // deno-lint-ignore require-await
    client.on('guildMemberAdd', async (member) => {
        const guildId = member.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = member.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('success')
                    .setTitle('Nouveau Membre')
                    .setDescription(`L'utilisateur ${member.user.tag} a rejoint le serveur.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });

    // deno-lint-ignore require-await
    client.on('guildMemberRemove', async (member) => {
        const guildId = member.guild.id;
        const guildConfig = config[guildId];
        if (guildConfig && guildConfig.logChannel) {
            const logChannel = member.guild.channels.cache.get(guildConfig.logChannel);
            if (logChannel) {
                const embed = createKeplerEmbed('danger')
                    .setTitle('Membre Parti')
                    .setDescription(`L'utilisateur ${member.user.tag} a quitté le serveur.`);

                logChannel.send({ embeds: [embed] });
            }
        }
    });
};
