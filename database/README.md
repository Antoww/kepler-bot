# 🗄️ Base de données

Ce dossier contient la couche d'accès aux données du bot, utilisant **Supabase** (PostgreSQL).

## 📁 Structure

```
database/
├── supabase.ts    # Client Supabase et fonctions de base
└── db.ts          # Fonctions d'accès aux données métier
```

---

## 📦 Fichiers

### `supabase.ts`

Initialisation du client Supabase et fonctions de base pour les rappels.

```typescript
import { supabase } from './supabase.ts';
```

**Fonctions exportées :**
- `initDatabase()` - Initialise la connexion
- `createReminder()` - Créer un rappel
- `getReminder()` - Récupérer un rappel
- `getUserReminders()` - Rappels d'un utilisateur
- `deleteReminder()` - Supprimer un rappel
- `getExpiredReminders()` - Rappels expirés
- `updateLogChannel()` - Configurer le canal de logs
- `getLogChannel()` - Récupérer le canal de logs

---

### `db.ts`

Fonctions métier pour toutes les tables du bot.

**Modules couverts :**

| Module | Fonctions |
|--------|-----------|
| **Rappels** | `createReminder`, `getReminder`, `deleteReminder` |
| **Anniversaires** | `setBirthday`, `getBirthday`, `deleteBirthday`, `getAllBirthdays` |
| **Modération** | `addModerationHistory`, `getModerationHistory`, `createWarning`, `getUserWarnings` |
| **Bans/Mutes temp** | `createTempBan`, `createTempMute`, `getExpiredTempBans`, `getExpiredTempMutes` |
| **Configuration** | `updateModerationChannel`, `getModerationChannel`, `getMuteRole` |

---

## 🏗️ Tables Supabase

| Table | Description |
|-------|-------------|
| `reminders` | Rappels utilisateurs |
| `birthdays` | Dates d'anniversaire |
| `server_configs` | Configuration par serveur |
| `warnings` | Avertissements |
| `moderation_history` | Historique des sanctions |
| `temp_bans` | Bans temporaires |
| `temp_mutes` | Mutes temporaires |
| `giveaways` | Giveaways actifs |
| `giveaway_participants` | Participants aux giveaways |
| `count_config` | Configuration du jeu de comptage |
| `command_stats` | Statistiques de commandes |
| `message_stats` | Statistiques de messages |
| `daily_stats` | Stats journalières par serveur |
| `global_daily_stats` | Stats journalières globales |

---

## 🧱 Migrations

Avant d’activer le système de tickets, exécuter dans l’éditeur SQL Supabase :

```text
database/migrations/20260728_add_ticket_settings.sql
```

Cette migration ajoute à `server_configs` le salon du panneau, le rôle support et la personnalisation du message/bouton.

---

## 🔧 Configuration

Variables d'environnement requises :

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=clé_service_role_réservée_au_backend
```

---

## 🔒 Sécurité (RLS)

Les tables exposées ont **Row Level Security** activé. Le bot utilise la clé
`service_role`, qui contourne la RLS côté serveur. Cette clé ne doit jamais être
exposée dans un client, un dépôt Git ou un message.

---

## 💡 Utilisation

```typescript
import { setBirthday, getBirthday } from './database/db.ts';

// Définir un anniversaire
await setBirthday(guildId, userId, 25, 12, 1990);

// Récupérer un anniversaire
const birthday = await getBirthday(guildId, userId);
```

### Avec retry automatique

Les fonctions critiques utilisent `withNetworkRetry` pour gérer les erreurs réseau :

```typescript
import { withNetworkRetry } from '../utils/retryHelper.ts';

const data = await withNetworkRetry(async () => {
    return await supabase.from('table').select('*');
}, 'description de l\'opération');
```
