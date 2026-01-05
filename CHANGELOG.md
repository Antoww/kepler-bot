# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [0.1.3] - 2026-01-05 (Beta 1.3)

### ✨ Ajouté

#### Commandes Administration
- `/graph` - Statistiques d'utilisation du bot (commandes, messages, utilisateurs, tendances)
- `/giveaway` - Système complet de giveaways
- `/annonce` - Envoyer des annonces
- `/audit` - Logs d'audit
- `/bdayconfig` - Configuration anniversaires
- `/logconfig` - Configuration logs
- `/moderationconfig` - Configuration modération
- `/muteroleconfig` - Configuration rôle mute

#### Commandes Jeux
- `/8ball` - Boule magique
- `/blague` - Blagues aléatoires
- `/chifoumi` - Pierre-feuille-ciseaux
- `/coinflip` - Pile ou face
- `/count` - Jeu de comptage
- `/couple` - Générateur d'image de couple (optimisé WebP)
- `/golem` - Invocation de golem
- `/meme` - Memes aléatoires
- `/puissance4` - Puissance 4 multijoueur

#### Commandes Modération
- `/ban`, `/unban` - Bannissement
- `/kick` - Expulsion
- `/mute`, `/unmute` - Mute par rôle
- `/timeout`, `/untimeout` - Timeout Discord
- `/warn` - Avertissements
- `/clear` - Suppression de messages
- `/sanctions` - Historique des sanctions

#### Commandes Utilitaires
- `/birthday` - Gestion anniversaires
- `/genpass` - Générateur de mots de passe
- `/info` - Informations (serveur, utilisateur, canal, rôle)
- `/lyrics` - Paroles de chansons
- `/mesdonnees` - Gestion RGPD complète
- `/minecraft-uuid` - UUID Minecraft
- `/qrcode` - Générateur de QR codes
- `/reminder`, `/reminders` - Système de rappels
- `/rolelist` - Liste des rôles

#### Commandes Générales
- `/help` - Aide interactive
- `/ping` - Latence améliorée
- `/botstats` - Statistiques techniques
- `/credits` - Crédits

#### Systèmes
- **Statistiques** : Tracking automatique des commandes et messages
- **RGPD** : Conformité complète (accès, portabilité, effacement, purge auto)
- **Anniversaires** : Vérification quotidienne + annonces
- **Rappels** : Gestionnaire avec répétition
- **Modération** : Débans/unmutes automatiques
- **Giveaways** : Fin automatique avec sélection gagnants
- **Comptage** : Jeu de comptage par canal
- **Logs** : Système complet (24+ événements Discord)

### 🔒 Sécurité
- RLS activé sur toutes les tables Supabase
- Policies pour service_role
- Fonctions sécurisées (search_path)

### 📊 Base de données
- 15 tables Supabase
- Migrations versionnées
- Retry automatique pour la résilience réseau

### 🎨 Optimisations
- Cache avatars (commande couple)
- Format WebP pour les images générées
- Rate limit handling automatique
- Exponential backoff pour les retries

### 📚 Documentation
- README complets (commands/, database/, utils/, events/, docs/)
- Guides de contribution
- Documentation RGPD

---

## Format des entrées

### Types de changements
- `✨ Ajouté` : Nouvelles fonctionnalités
- `🔧 Modifié` : Changements dans les fonctionnalités existantes
- `🗑️ Supprimé` : Fonctionnalités retirées
- `🐛 Corrigé` : Corrections de bugs
- `🔒 Sécurité` : Corrections de vulnérabilités
- `⚡ Performance` : Améliorations de performance
- `📚 Documentation` : Changements dans la documentation
