import config from '../config.json' with {type:"json"};
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EmbedBuilder, PresenceUpdateStatus } from 'discord.js';
import dayjs from 'dayjs';

const bdayFilePath = join(import.meta.dirname, '../database/bday.json');

export const name = 'ready';
export const once = true;
export async function execute(client) {

    client.user.setPresence({ activities: [{ name: `Version ${config.botversion}` }], status: PresenceUpdateStatus.Online });

    setInterval(async () => {
        const today = dayjs().format('DD/MM');
        let bdays = {};

        if (existsSync(bdayFilePath)) {
            bdays = JSON.parse(readFileSync(bdayFilePath, 'utf8'));
        }

        for (const [userId, date] of Object.entries(bdays)) {
            if (date.startsWith(today)) {
                const user = await client.users.fetch(userId);
                const guilds = client.guilds.cache;

                guilds.forEach(guild => {
                    const channel = guild.channels.cache.find(ch => ch.name.includes('anniversaire') || ch.name.includes('birthday'));
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor(`#${Math.floor(Math.random() * 16777215).toString(16)}`)
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

    console.log(`[LOG : ${new Date().toLocaleDateString()}] Statut du bot défini : "Version ${config.botversion}" (En ligne).`);
}