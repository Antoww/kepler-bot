# 🔧 Utilitaires

Ce dossier contient les modules utilitaires partagés par le bot.

## 📁 Structure

```
utils/
├── moderation/          # Logs et archives de modération
├── privacy/             # Export, suppression et purge RGPD
├── reports/             # Signalements utilisateur et actions associées
├── stats/               # Tracking, agrégation et rendu des graphiques
├── tickets/             # Cycle de vie des tickets
├── xp/                  # Progression, récompenses et journal XP
├── discordErrorReporter.ts
├── logger.ts
├── retryHelper.ts
├── theme.ts
└── timezone.ts
```

---

## 📊 `stats/tracker.ts`

Module de tracking des statistiques du bot pour la commande `/graph`.

### Fonctions de tracking

```typescript
import { trackCommand, trackMessage } from './utils/stats/tracker.ts';

// Tracker une commande
await trackCommand({
    command_name: 'ping',
    user_id: '123456789',
    guild_id: '987654321',
    success: true
});

// Tracker un message
await trackMessage({
    guild_id: '987654321',
    channel_id: '111222333',
    user_id: '123456789'
});
```

### Fonctions de lecture

| Fonction | Description |
|----------|-------------|
| `getDailyStats(days, guildId?)` | Stats journalières |
| `getTopCommands(days, limit, guildId?)` | Top commandes utilisées |
| `getTopUsers(days, limit, guildId)` | Utilisateurs les plus actifs |
| `getTotalStats(guildId?)` | Totaux globaux |
| `getTrend(days, guildId?)` | Tendance (hausse/baisse) |

---

## 🔐 `privacy/rgpdData.ts`

Module complet de gestion RGPD pour la conformité aux données personnelles.

### Fonctions principales

```typescript
import { 
    getCompleteUserDataSummary,
    exportCompleteUserData,
    deleteVoluntaryUserData,
    purgeAllOldData
} from './utils/privacy/rgpdData.ts';
```

| Fonction | Description | Droit RGPD |
|----------|-------------|------------|
| `getCompleteUserDataSummary(userId)` | Résumé des données | Accès |
| `exportCompleteUserData(userId)` | Export JSON complet | Portabilité |
| `deleteVoluntaryUserData(userId)` | Supprimer données volontaires | Effacement |
| `deleteCompleteUserData(userId, options)` | Suppression sélective | Effacement |
| `purgeAllOldData()` | Purge automatique | Conservation |

### Durées de conservation

- **Statistiques** : 90 jours
- **Modération** : 2 ans
- **Données personnelles** : Jusqu'à suppression manuelle

---

## 📝 `moderation/logger.ts`

Envoi des logs de modération dans le canal configuré.

```typescript
import { logModeration } from './utils/moderation/logger.ts';

await logModeration(client, guildId, {
    action: 'BAN',
    moderator: moderatorUser,
    target: targetUser,
    reason: 'Spam',
    duration: '7d'
});
```

---

## 💾 `moderation/messageArchiver.ts` et `moderation/archiveCache.ts`

Archivage des messages supprimés pour les logs.

```typescript
import {
    formatMessagesForArchive,
    uploadToPastebin
} from './utils/moderation/messageArchiver.ts';

const archive = formatMessagesForArchive(messages, 'Europe/Paris');
const url = await uploadToPastebin(archive, 'Messages supprimés');
```

---

## 🔄 `retryHelper.ts`

Wrapper pour retry automatique des requêtes réseau (Supabase, API externes).

```typescript
import { withNetworkRetry } from './utils/retryHelper.ts';

const result = await withNetworkRetry(
    async () => {
        // Opération qui peut échouer
        return await fetch('https://api.example.com/data');
    },
    'récupération des données', // Description pour les logs
    3,  // Nombre de tentatives (défaut: 3)
    1000 // Délai initial en ms (défaut: 1000)
);
```

### Comportement

- **Exponential backoff** : Le délai double à chaque tentative
- **Jitter** : Ajout d'un délai aléatoire pour éviter les thundering herds
- **Logs** : Affiche les tentatives dans la console
