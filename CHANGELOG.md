# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

---

## [1.1.0] - 2026-08-07 (Stable)

### 🎯 Points clés
- **AutoMod enrichi** avec observation, filtres, seuils, exemptions et actions par règle
- **Centre `/settings` modernisé** et migré vers Discord Components V2
- **Statistiques serveur étoffées**, dont la courbe des arrivées et départs
- **XP plus dynamique** avec cooldown par défaut de 5 secondes et interfaces V2
- **Invitations modernisées** et classements XP/invitations paginés

👉 [Voir les notes de version détaillées](changelogs/v1.1.0.md)

### ✨ Ajouté
- Mode observation et protection anti-raid pour l'AutoMod
- Domaines et mots interdits personnalisables
- Seuils et sanctions progressives configurables
- Suivi quotidien des arrivées et départs
- Navigation directe vers une page des classements XP et invitations
- Timestamps relatifs dans les interfaces XP

### 🔧 Modifié
- Réorganisation complète des menus `/settings`
- Migration de `/settings`, `/xp` et `/invitations` vers Components V2
- Nouvelle barre de progression XP monospace
- Graphiques clarifiés avec couleurs, légendes, dates et libellés distincts
- Discord.js mis à niveau vers la version 14.23.2

### 🐛 Corrigé
- Sections V2 invalides sur les serveurs dépourvus d'icône
- Chevauchements de dates et séries trop proches dans les graphiques
- Rendu des emojis dans les images du conteneur Docker
- Mentions silencieuses dans les classements Components V2

### 📚 Documentation
- Documentation AutoMod et graphiques mise à jour
- Nouvelle roadmap publique jusqu'à Kepler 2.0
- Procédure de publication et notes Discord pour la V1.1

---

## [1.0.1] - 2026-07-31 (Stable)

### 🎯 Points clés
- **Invitations existantes restaurées** dans le classement et les statistiques
- **Synchronisation à la demande** avant l'affichage de `/invitations`
- **Identité des embeds harmonisée** avec l'auteur et l'avatar de Kepler

👉 [Voir les notes de version détaillées](changelogs/v1.0.1.md)

### 🐛 Corrigé
- Le classement des invitations pouvait rester vide lorsque les liens avaient
  été créés avant l'activation du suivi
- Les compteurs Discord et les arrivées suivies sont désormais fusionnés sans
  double comptage
- Les invitations actives sans utilisation apparaissent également dans le
  classement

### 🔧 Modifié
- Les statistiques distinguent les utilisations Discord, les arrivées suivies,
  les membres encore présents et les départs suivis
- Les embeds standards affichent l'identité de Kepler tout en conservant leurs
  footers informatifs
- Le nom du conteneur Docker est harmonisé avec celui du projet

---

## [1.0.0] - 2026-07-30 (Stable)

### 🎯 Points clés
- **Première version stable** de Kepler
- **XP par serveur** : profils, classement, récompenses, boosts et journaux
- **Tickets complets** : panneau configurable, suivi, fermeture, réouverture et archivage
- **Gestion des invitations** : synchronisation, accueil, journaux et classement
- **Auto-modération** : liens, invitations, spam, doublons, majuscules et mentions
- **Configuration centralisée** dans `/settings`, avec fuseau horaire par serveur
- **Exploitation renforcée** : signalement des erreurs Discord, migrations idempotentes et documentation de production

👉 [Voir les notes de version détaillées](changelogs/v1.0.0.md)

### ✨ Ajouté
- Commandes `/xp`, `/xpadmin` et `/invitations`
- Commande `/clear` avec filtrage par membre et export des messages supprimés
- Configuration du dashboard, des tickets, de l'XP, des invitations et de l'auto-modération
- Fuseaux horaires IANA pour les rappels et fonctions planifiées
- Suivi durable du panneau de tickets publié

### 🔧 Modifié
- Regroupement des anciens écrans de configuration dans `/settings`
- Réorganisation des managers, services de modération, statistiques, rapports et tickets
- Harmonisation des couleurs et des embeds
- Amélioration des notifications et archives de modération

### 🔒 Sécurité
- Isolation des données par serveur
- RLS activée sur les nouvelles tables Supabase
- Fonctions sensibles réservées à la clé serveur `service_role`
- Contrôles de permissions et de hiérarchie renforcés pour la modération

### 📚 Documentation
- Guides dédiés à l'XP, l'auto-modération, aux invitations et aux fuseaux horaires
- Procédure de migration et checklist de mise en production 1.0.0

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
