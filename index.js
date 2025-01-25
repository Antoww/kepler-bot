const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();

// Initialisation du client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

// Collection des commandes
client.commands = new Collection();

// Chargement des commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if (command.data && command.data.name) {
        client.commands.set(command.data.name, command);
    } else {
        console.error(`[LOG : ${new Date().toLocaleDateString()}] La commande dans ${filePath} n'a pas de propriété 'data' ou 'name' définie.`);
    }
}

// Chargement des événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Enregistrement des commandes après l'événement 'ready'
client.once('ready', async () => {
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Connecté en tant que ${client.user.tag}, nous sommes le ${new Date().toLocaleDateString()} et il est ${new Date().toLocaleTimeString()}`);
    console.log(`[LOG : ${new Date().toLocaleTimeString()}] Prêt à écouter les commandes sur ${client.guilds.cache.size} serveurs.`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Mise à jour des commandes slash...');
        const commands = client.commands.map(command => command.data.toJSON());

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );

        console.log('Commandes slash enregistrées avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
    }
});

// Connexion du client
client.login(process.env.TOKEN);
