import config from '../config.json' with {type:"json"};
import { existsSync, readFileSync } from 'node:fs';
import * as path from "jsr:@std/path";
import { EmbedBuilder, PresenceUpdateStatus, type Client } from 'discord.js';
import dayjs from 'dayjs';
import type { Birthdays } from '../types.d.ts';

const bdayFilePath = path.join(Deno.cwd(), '../database/bday.json');

export const name = 'ready';
export const once = true;
export function execute(client: Client<true>) {

    client.user.setPresence({ activities: [{ name: `Version ${config.botversion}` }], status: PresenceUpdateStatus.Online });

    setInterval(async () => {
        const today = dayjs().format('DD/MM');
        let bdays: Birthdays = {};

        if (existsSync(bdayFilePath)) {
            bdays = JSON.parse(readFileSync(bdayFilePath, 'utf8'));
        }

        for (const users of Object.values(bdays)) {
            for (const [userId, date] of Object.entries(users)) {
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
                                    iconURL: user.displayAvatarURL({ forceStatic: false })
                                })
                                .setTimestamp();
                        
                            if (!channel.isTextBased()) return;
                            channel.send({ embeds: [embed] });
                        }
                    });
                }
            }
        }
    }, 24 * 60 * 60 * 1000);

    console.log(`[LOG : ${new Date().toLocaleDateString()}] Statut du bot défini : "Version ${config.botversion}" (En ligne).`);
}