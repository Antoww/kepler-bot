const config = require('../config.json');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const dayjs = require('dayjs');

const bdayFilePath = path.join(__dirname, '../database/bday.json');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`${__filename} a été chargé avec succès.`);

        const botversion = config.botversion;

        const { PresenceUpdateStatus } = require('discord.js');
        client.user.setPresence({ activities: [{ name: `Version ${botversion}` }], status: PresenceUpdateStatus.Online });

        setInterval(async () => {
            const today = dayjs().format('DD/MM');
            let bdays = {};

            if (fs.existsSync(bdayFilePath)) {
                bdays = JSON.parse(fs.readFileSync(bdayFilePath, 'utf8'));
            }

            for (const [userId, date] of Object.entries(bdays)) {
                if (date.startsWith(today)) {
                    const user = await client.users.fetch(userId);
                    const guilds = client.guilds.cache;

                    guilds.forEach(guild => {
                        const channel = guild.channels.cache.find(ch => ch.name.includes('anniversaire') || ch.name.includes('birthday'));
                        if (channel) {
                            const embed = new EmbedBuilder()
                                .setColor('#0099ff')
                                .setTitle('Joyeux Anniversaire!')
                                .setDescription(`Joyeux anniversaire <@${userId}>! 🎉🎂`)
                                .setFooter({
                                    text: `Anniversaire de ${user.username}`,
                                    iconURL: user.displayAvatarURL({ dynamic: true })
                                })
                                .setTimestamp();

                            channel.send({ embeds: [embed] });
                        }
                    });
                }
            }
        }, 24 * 60 * 60 * 1000);

        console.log(`Statut du bot défini : "Version ${config.botversion}" (En ligne).`);
    },
};