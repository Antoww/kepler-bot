# Structure des Événements

## Organisation

Le dossier `events` est maintenant organisé de manière claire avec une structure hiérarchique :

```
events/
├── core/           # Événements fondamentaux du bot
├── handlers/       # Gestionnaires d'événements Discord
├── logs/          # Fonctions de logging réutilisables
├── logEvents.js   # Ancien système de logs (à migrer/supprimer)
└── remind.js      # Système de rappels (à migrer/supprimer)
```

## Dossiers

### 📁 `core/`
Contient les événements essentiels au fonctionnement du bot :
- `ready.ts` - Événement de démarrage du bot
- `interactionCreate.ts` - Gestion des interactions (commandes slash)
- `birthdayManager.ts` - Gestionnaire d'anniversaires

### 📁 `handlers/`
Contient tous les gestionnaires d'événements Discord organisés par catégorie :

**Canaux :**
- `channelCreate.ts` - Création de canal
- `channelDelete.ts` - Suppression de canal  
- `channelUpdate.ts` - Modification de canal

**Messages :**
- `messageDelete.ts` - Suppression de message
- `messageUpdate.ts` - Modification de message
- `messageDeleteBulk.ts` - Suppression en masse

**Membres :**
- `guildMemberAdd.ts` - Arrivée de membre
- `guildMemberRemove.ts` - Départ/kick de membre
- `guildMemberUpdate.ts` - Modification de membre
- `voiceStateUpdate.ts` - Événements vocaux

**Modération :**
- `guildBanAdd.ts` - Bannissement
- `guildBanRemove.ts` - Débannissement

**Rôles :**
- `roleCreate.ts` - Création de rôle
- `roleDelete.ts` - Suppression de rôle
- `roleUpdate.ts` - Modification de rôle

**Serveur :**
- `guildUpdate.ts` - Modification du serveur

**Invitations :**
- `inviteCreate.ts` - Création d'invitation
- `inviteDelete.ts` - Suppression d'invitation

**Emojis & Stickers :**
- `emojiCreate.ts` - Création d'emoji
- `emojiDelete.ts` - Suppression d'emoji
- `emojiUpdate.ts` - Modification d'emoji
- `stickerCreate.ts` - Création de sticker
- `stickerDelete.ts` - Suppression de sticker

### 📁 `logs/`
Contient les fonctions de logging réutilisables :
- `guildLogs.ts` - Logs pour canaux, rôles, serveur
- `messageLogs.ts` - Logs pour les messages
- `memberLogs.ts` - Logs pour les membres et modération
- `voiceAndMemberLogs.ts` - Logs vocaux et modifications membres
- `miscLogs.ts` - Logs pour invitations, emojis, stickers

## Fonctionnement

1. **Chargement Automatique** : Le système charge automatiquement tous les fichiers `.ts` et `.js` de manière récursive
2. **Imports Relatifs** : Les handlers importent les fonctions depuis `../logs/`
3. **Separation of Concerns** : Chaque handler ne fait qu'une chose : écouter un événement et appeler la fonction de log appropriée

## Exemple de Handler

```typescript
import { Events, Message, PartialMessage } from 'discord.js';
import { logMessageDelete } from '../logs/messageLogs.ts';

export const name = Events.MessageDelete;
export const once = false;

export async function execute(message: Message | PartialMessage) {
    await logMessageDelete(message);
}
```

## Avantages de cette Structure

1. **Lisibilité** : Chaque type d'événement est dans son propre dossier
2. **Maintenabilité** : Les fonctions de log sont réutilisables et centralisées
3. **Extensibilité** : Facile d'ajouter de nouveaux événements
4. **Debugging** : Plus facile de trouver et debugger un événement spécifique
5. **Performance** : Chargement optimisé avec logs de débogage

## Migration des Anciens Fichiers

Les fichiers `logEvents.js` et `remind.js` sont les anciens systèmes qui doivent être migrés ou supprimés une fois que tous les nouveaux logs sont fonctionnels.
