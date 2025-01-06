module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`${__filename} a été chargé avec succès.`);

        // Définir le statut du bot
        client.user.setPresence({
            activities: [
                { 
                    name: 'Antow le bg', 
                    type: 'WATCHING',
                }
            ],
            status: 'online',
        });

      // Autres possibilités de statut :
        // type: 'PLAYING' -> "Joue à"
        // type: 'STREAMING' -> "Stream"
        // type: 'LISTENING' -> "Écoute"
        // type: 'WATCHING' -> "Regarde"
        // type: 'COMPETING' -> "Compétitionne dans"

        // Statuts possibles :
        // status: 'online' -> En ligne
        // status: 'idle' -> Inactif
        // status: 'dnd' -> Ne pas déranger
        // status: 'invisible' -> Invisible

        console.log(`Statut du bot défini : "Regarde Antow le bg" (Ne pas déranger).`);
    },
};
