const config = require('../config.json');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`${__filename} a été chargé avec succès.`);

        const botversion = config.botversion;

        const { PresenceUpdateStatus } = require('discord.js');
        client.user.setPresence({ activities: [{ name: `Version ${botversion}` }], status: PresenceUpdateStatus.Online });

        console.log(`Statut du bot défini : "Version ${config.botversion}" (En ligne).`);
    },
};