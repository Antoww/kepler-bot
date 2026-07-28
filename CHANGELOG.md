# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [0.1.5] - 2026-07-28 (Beta 1.5)

### 🎯 Points clés
- **Système de tickets complet** : panneau personnalisable, salons privés et rôle support
- **Cycle de vie des tickets** : fermeture utilisateur, réouverture, archivage et clôture définitive
- **Logs et archives** : suivi des états et export texte des conversations
- **Sécurité renforcée** : contrôles de permissions à l’exécution et opérations liées à leur propriétaire
- **Settings amélioré** : valeurs existantes présélectionnées et confirmations sans retour à l’accueil

👉 [Voir les patch notes détaillées](changelogs/v0.1.5.md)

### ✨ Ajouté
- Configuration des tickets depuis `/settings`
- Personnalisation du message, du bouton et de sa couleur
- Choix du salon du panneau, de la catégorie, du rôle support et du salon de logs
- Boutons de fermeture, réouverture et archivage
- Archives `.txt` comprenant messages, embeds et liens des pièces jointes

### 🔒 Sécurité
- Vérification centrale des permissions Discord avant l’exécution des commandes
- Révalidation des permissions et de la hiérarchie avant les sanctions
- Suppression des rappels liée atomiquement à leur propriétaire
- Validation du serveur, salon et message pour les interactions de giveaways

### 🐛 Corrigé
- Correction des confirmations de fermeture de ticket
- Priorité correcte aux droits administrateur et support
- Prévention des tickets multiples pour un même utilisateur
- Maintien de la section active après une modification dans `/settings`

---

## [0.1.3] - 2026-01-05 (Beta 1.3)

### 🎯 Points clés
- **Statistiques avancées** : Commande `/graph` avec 5 types de graphiques
- **RGPD complet** : Commande `/mesdonnees` avec export et suppression
- **Optimisations** : WebP, cache, latence améliorée
- **Versioning** : Système de versions avec display dans les commandes

👉 [Voir le changelog détaillé](changelogs/v0.1.3.md)

### ✨ Ajouté

#### Commandes
- `/graph` - Statistiques d'utilisation avec graphiques (owner only)
- `/mesdonnees` - Gestion RGPD complète (voir, exporter, supprimer)

#### Systèmes
- **Tracking automatique** : Commandes et messages avec agrégation quotidienne
- **RGPD Manager** : Conformité complète (accès, portabilité, effacement, purge auto)
- **Versioning** : version.json + bump-version.ts + affichage dans /help et /botstats

#### Base de données
- Tables : `command_stats`, `message_stats`, `daily_stats`, `global_daily_stats`
- RLS policies renforcées sur toutes les tables

### 🔧 Améliorations
- **Images `/couple`** : WebP (85%), avatars 128px, cache 5min → ~27KB à ~10-15KB
- **Latence `/ping`** : Mesure round-trip réelle, gestion -1ms
- **Compatibilité Deno** : Remplacement process.cpuUsage() par Deno.loadavg()

### 🐛 Corrigé
- Fix RLS bloquant les inserts de stats
- Fix latence affichant -1ms
- Fix warning process.cpuUsage() sous Deno
- Fix layout embeds avec spacer fields

### 📚 Documentation
- READMEs créés : commands/, database/, utils/, events/, docs/
- RELEASE.md : Workflow Dokploy complet
- changelogs/ : Dossier avec détails par version

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
