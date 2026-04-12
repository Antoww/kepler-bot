# Commande Graph - Statistiques du Serveur

## Vue d'ensemble

La commande `/graph` a été complètement repensée pour offrir des statistiques détaillées spécifiques à chaque serveur Discord. Les administrateurs de serveur peuvent désormais analyser l'activité et les tendances de leur communauté.

## Permissions

- **`/graph`** : Requiert les permissions d'**Administrateur** sur le serveur
- **`/globalstats`** : Réservé au **propriétaire du bot** uniquement (statistiques globales multi-serveurs)

## Sous-commandes disponibles

### `/graph vue-ensemble`
Affiche une vue d'ensemble complète des statistiques du serveur :
- 👥 **Membres** : Total, humains, bots
- 📨 **Activité** : Messages et commandes sur la période choisie
- 📈 **Historique** : Statistiques totales depuis le début du tracking
- 📉 **Tendances** : Graphiques de tendance sur 14 jours
- 🏆 **Top 5** : Commandes les plus utilisées

**Options :**
- `jours` : Nombre de jours à analyser (7-90, défaut: 30)

### `/graph activite`
Statistiques détaillées sur l'activité du serveur :
- 💬 **Messages** : Total, moyenne quotidienne, jour record
- ⚡ **Commandes** : Total, moyenne quotidienne
- 📊 **Graphique** : Tendance visuelle de l'activité

**Options :**
- `jours` : Nombre de jours à analyser (7-90, défaut: 30)

### `/graph membres`
Informations sur les membres du serveur :
- 📊 **Composition** : Total membres, humains, bots, en ligne
- 🎭 **Rôles** : Nombre de rôles, rôle le plus haut
- 💎 **Boosts** : Niveau de boost et nombre de boosts
- 📅 **Informations** : Date de création, propriétaire, canaux

### `/graph canaux`
Classement des canaux les plus actifs :
- 📺 Liste des canaux avec graphique à barres
- Nombre de messages par canal

**Options :**
- `jours` : Nombre de jours à analyser (7-90, défaut: 30)
- `limite` : Nombre de canaux à afficher (5-15, défaut: 10)

### `/graph utilisateurs`
Classement des utilisateurs les plus actifs :
- 👑 Top des membres avec médailles (🥇🥈🥉)
- Nombre de messages par utilisateur

**Options :**
- `jours` : Nombre de jours à analyser (7-90, défaut: 30)
- `limite` : Nombre d'utilisateurs à afficher (5-20, défaut: 10)

### `/graph commandes`
Statistiques sur l'utilisation des commandes :
- ⚡ Total et moyenne des commandes
- 🏆 Top 10 des commandes utilisées avec graphique
- 📉 Tendance sur 14 jours

**Options :**
- `jours` : Nombre de jours à analyser (7-90, défaut: 30)

## Commande GlobalStats (Owner uniquement)

### `/globalstats vue-ensemble`
Vue d'ensemble des statistiques globales du bot (tous les serveurs confondus)

### `/globalstats commandes`
Statistiques globales des commandes exécutées

**Options :**
- `jours` : Nombre de jours à analyser (1-90, défaut: 30)

### `/globalstats messages`
Statistiques globales des messages

**Options :**
- `jours` : Nombre de jours à analyser (1-90, défaut: 30)

### `/globalstats tendance`
Graphique de tendance global

**Options :**
- `type` : Type de statistique (commandes/messages) - **Requis**
- `jours` : Nombre de jours (7-30, défaut: 14)

## Éléments visuels

Les graphiques utilisent des caractères ASCII pour une visualisation claire :
- **Barres horizontales** : `█░` pour les classements
- **Sparklines** : `▁▂▃▄▅▆▇█` pour les tendances rapides
- **Graphiques verticaux** : Pour les tendances détaillées

## Nouvelles fonctionnalités ajoutées

1. **Statistiques des canaux** : Identification des canaux les plus actifs
2. **Statistiques des membres** : Informations détaillées sur la composition du serveur
3. **Graphiques visuels améliorés** : Meilleure lisibilité
4. **Séparation Owner/Admin** : 
   - `/graph` pour les administrateurs de serveur
   - `/globalstats` pour le propriétaire du bot
5. **Personnalisation** : Options de période et de limite configurable

## Modifications techniques

### Fichiers modifiés :
- **`commands/administration/graph.ts`** : Nouvelle implémentation pour les serveurs
- **`utils/statsTracker.ts`** : Ajout de la fonction `getTopChannels()`

### Nouveaux fichiers :
- **`commands/administration/globalstats.ts`** : Commande pour les statistiques globales (owner)

### Fonctions ajoutées dans statsTracker :
```typescript
getTopChannels(days: number, limit: number, guildId: string): Promise<ChannelActivity[]>
```

## Exemples d'utilisation

```
/graph vue-ensemble jours:30
→ Affiche une vue d'ensemble des 30 derniers jours

/graph canaux jours:7 limite:5
→ Affiche les 5 canaux les plus actifs sur 7 jours

/graph utilisateurs jours:14 limite:15
→ Affiche les 15 utilisateurs les plus actifs sur 14 jours

/globalstats tendance type:messages jours:30
→ (Owner) Graphique de tendance des messages sur 30 jours
```

## Migration depuis l'ancienne version

L'ancienne commande `/graph` réservée à l'owner a été renommée `/globalstats`. Les fonctionnalités sont préservées mais maintenant séparées :

**Avant :**
- `/graph` avec option `global:true/false`

**Maintenant :**
- `/graph` : Pour les administrateurs (stats du serveur uniquement)
- `/globalstats` : Pour l'owner (stats globales)

## Base de données

Les statistiques sont trackées automatiquement dans les tables :
- `daily_stats` : Statistiques journalières par serveur
- `command_stats` : Historique des commandes exécutées
- `message_stats` : Statistiques de messages par canal/utilisateur
- `global_daily_stats` : Statistiques globales (tous serveurs)
