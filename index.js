const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();
const { guildId } = require('./config.json');

// Initialisation du client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Collection des commandes
client.commands = new Collection();

// Chargement des commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
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
    console.log(`Connecté en tant que ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        console.log('Mise à jour des commandes slash...');
        const commands = client.commands.map(command => command.data.toJSON());

        await rest.put(
            Routes.applicationGuildCommands(client.user.id, guildId),
            { body: commands }
        );

        console.log('Commandes slash enregistrées avec succès.');
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
    }
});

// Connexion du bot
client.login(process.env.TOKEN);
