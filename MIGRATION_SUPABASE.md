# Migration vers Supabase - Guide Complet

## 🎯 Objectif
Migrer votre bot Discord Kepler de MySQL/MariaDB vers Supabase (PostgreSQL).

## 📋 Prérequis

1. **Compte Supabase** : Créez un compte sur [supabase.com](https://supabase.com)
2. **Projet Supabase** : Créez un nouveau projet
3. **Variables d'environnement** : Récupérez votre URL et clé API

## 🚀 Étapes de Migration

### 1. Configuration Supabase

1. Connectez-vous à votre dashboard Supabase
2. Allez dans **Settings > API**
3. Copiez :
   - **Project URL** (ex: `https://your-project.supabase.co`)
   - **anon public** key

### 2. Configuration des Variables d'Environnement

Créez un fichier `.env` basé sur `env.example` :

```env
# Token Discord Bot
TOKEN=votre_token_discord_ici

# Configuration Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=votre_clé_anon_supabase_ici
```

### 3. Initialisation de la Base de Données

1. Dans votre dashboard Supabase, allez dans **SQL Editor**
2. Exécutez le contenu du fichier `database/supabase_init.sql`
3. Cela créera les tables `reminders` et `server_configs`

### 4. Migration des Données (Optionnel)

Si vous avez des données existantes à migrer :

```bash
# Exécuter le script de migration
deno run --allow-all database/migrate_to_supabase.ts
```

**Note** : Ce script nécessite que les anciennes variables MySQL soient encore configurées.

### 5. Test de la Migration

1. Arrêtez votre bot actuel
2. Démarrez avec la nouvelle configuration :
   ```bash
   docker-compose up
   ```
3. Vérifiez les logs pour confirmer la connexion à Supabase

## 🔧 Changements Effectués

### Fichiers Modifiés
- `index.ts` : Import de la nouvelle configuration Supabase
- `database/supabase.ts` : Nouveau fichier de configuration Supabase
- `events/remind.js` : Import mis à jour
- `events/guildLogs.ts` : Import mis à jour
- `commands/logconfig.ts` : Import mis à jour
- `commands/reminder.ts` : Import mis à jour
- `docker-compose.yml` : Suppression de MariaDB, ajout des variables Supabase
- `env.example` : Variables d'environnement mises à jour

### Fichiers Créés
- `database/supabase_init.sql` : Script d'initialisation Supabase
- `database/migrate_to_supabase.ts` : Script de migration des données
- `MIGRATION_SUPABASE.md` : Ce guide

### Fichiers à Supprimer (Optionnel)
- `database/db.ts` : Ancienne configuration MySQL
- `database/init.sql` : Ancien script MySQL
- `database/add_server_configs.sql` : Plus nécessaire

## 🗄️ Différences entre MySQL et Supabase

| Aspect | MySQL/MariaDB | Supabase (PostgreSQL) |
|--------|---------------|----------------------|
| Type | Base locale/cloud | Base cloud |
| Gestion | Manuel | Automatique |
| Scaling | Manuel | Automatique |
| Backups | Manuel | Automatique |
| Interface | phpMyAdmin | Dashboard web |
| API | REST manuel | REST automatique |

## ✅ Avantages de Supabase

1. **Pas de gestion serveur** : Plus besoin de maintenir MariaDB
2. **Backups automatiques** : Vos données sont sauvegardées automatiquement
3. **Interface moderne** : Dashboard web intuitif
4. **API REST automatique** : Endpoints générés automatiquement
5. **Real-time** : Possibilité d'ajouter des fonctionnalités temps réel
6. **Auth intégrée** : Système d'authentification prêt à l'emploi

## 🐛 Dépannage

### Erreur de Connexion
```
❌ Erreur lors de la connexion à Supabase
```
- Vérifiez vos variables d'environnement
- Assurez-vous que votre projet Supabase est actif

### Erreur de Table
```
❌ Erreur lors de la récupération des rappels
```
- Vérifiez que les tables ont été créées avec `supabase_init.sql`
- Vérifiez les permissions dans Supabase

### Erreur de Migration
```
❌ Erreur lors de la migration des données
```
- Vérifiez que l'ancienne base MySQL est accessible
- Vérifiez les variables d'environnement MySQL

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs de votre bot
2. Consultez la documentation Supabase
3. Vérifiez que tous les fichiers ont été mis à jour

## 🎉 Félicitations !

Votre bot est maintenant migré vers Supabase ! Vous bénéficiez maintenant d'une base de données cloud moderne et scalable. 