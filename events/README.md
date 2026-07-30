# 🎯 Événements Discord

Ce dossier gère tous les événements Discord et les gestionnaires automatisés du bot.

## 📁 Structure

```
events/
├── core/           # Événements principaux (ready, interactions)
├── handlers/       # Événements Discord (logs, tracking)
└── logs/           # Fonctions de logging réutilisables
```

---

## 🔧 Core (`/core/`)

Points d'entrée événementiels principaux.

| Fichier | Description |
|---------|-------------|
| `ready.ts` | Événement de démarrage du bot |
| `interactionCreate.ts` | Gestion des commandes slash et boutons |

Les services persistants sont regroupés dans le dossier racine `managers/`.

### Cycle de vie

```
Bot démarre
    │
    ├─► ready.ts (initialisation)
    │       │
    │       ├─► BirthdayManager.start()     (check toutes les heures)
    │       ├─► ReminderManager.start()     (check toutes les 30s)
    │       ├─► ModerationManager.start()   (check toutes les minutes)
    │       ├─► GiveawayManager.start()     (check toutes les 30s)
    │       └─► RGPDManager.start()         (purge quotidienne)
    │
    └─► interactionCreate.ts (écoute les commandes)
```

---

## 📡 Handlers (`/handlers/`)

Événements Discord pour le système de logs.

### Canaux
| Fichier | Événement |
|---------|-----------|
| `channelCreate.ts` | Création de canal |
| `channelDelete.ts` | Suppression de canal |
| `channelUpdate.ts` | Modification de canal |

### Messages
| Fichier | Événement |
|---------|-----------|
| `messageCreate.ts` | Nouveau message (tracking stats) |
| `messageDelete.ts` | Suppression de message |
| `messageDeleteBulk.ts` | Suppression en masse |
| `messageUpdate.ts` | Modification de message |

### Membres
| Fichier | Événement |
|---------|-----------|
| `guildMemberAdd.ts` | Arrivée d'un membre |
| `guildMemberRemove.ts` | Départ/kick d'un membre |
| `guildMemberUpdate.ts` | Modification (rôles, pseudo) |
| `voiceStateUpdate.ts` | Connexion/déconnexion vocale |

### Modération
| Fichier | Événement |
|---------|-----------|
| `guildBanAdd.ts` | Bannissement |
| `guildBanRemove.ts` | Débannissement |

### Serveur
| Fichier | Événement |
|---------|-----------|
| `guildUpdate.ts` | Modification du serveur |
| `roleCreate.ts` | Création de rôle |
| `roleDelete.ts` | Suppression de rôle |
| `roleUpdate.ts` | Modification de rôle |
| `inviteCreate.ts` | Création d'invitation |
| `inviteDelete.ts` | Suppression d'invitation |

### Emojis & Stickers
| Fichier | Événement |
|---------|-----------|
| `emojiCreate.ts` | Création d'emoji |
| `emojiDelete.ts` | Suppression d'emoji |
| `emojiUpdate.ts` | Modification d'emoji |
| `stickerCreate.ts` | Création de sticker |
| `stickerDelete.ts` | Suppression de sticker |

---

## 📋 Logs (`/logs/`)

Fonctions utilitaires pour créer les embeds de logs.

| Fichier | Contenu |
|---------|---------|
| `guildLogs.ts` | Logs serveur (canaux, rôles) |
| `memberLogs.ts` | Logs membres (join, leave, update) |
| `messageLogs.ts` | Logs messages (delete, edit) |
| `miscLogs.ts` | Logs divers (emojis, invites) |
| `voiceAndMemberLogs.ts` | Logs vocaux |

---

## 🔧 Création d'un handler

### Structure de base

```typescript
import { Events } from 'discord.js';

export const name = Events.MessageCreate;
export const once = false; // true = exécuté une seule fois

export async function execute(message) {
    // Ignorer les bots
    if (message.author.bot) return;
    
    // Logique...
}
```

### Avec client

```typescript
import { Events, Client } from 'discord.js';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
    console.log(`Connecté en tant que ${client.user?.tag}`);
}
```
