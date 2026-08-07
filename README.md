# Kepler — Centre de contrôle Discord 🚀

> **Version stable :** Kepler 1.1 est disponible. Le projet poursuit son
> évolution avec de nouvelles fonctionnalités prévues jusqu'à la version 2.0.

Kepler est un bot Discord polyvalent conçu pour administrer, automatiser et
analyser des communautés. Il réunit les outils courants d'un bot tout-en-un et
des fonctions de gestion plus spécialisées dans une interface centralisée.

Version actuelle : **1.1.0**

## Points forts

- 🛡️ Modération complète et auto-modération configurable.
- ⚙️ Centre de configuration interactif avec Discord Components V2.
- 📊 Statistiques serveur et graphiques historiques.
- ✨ Expérience, niveaux, récompenses et boosts.
- 🔗 Suivi des invitations et statistiques d'arrivée.
- 🎫 Tickets privés avec cycle de vie et archives.
- 🎂 Anniversaires, rappels, jeux et outils communautaires.
- 🔒 Isolation des données par serveur et contrôles de permissions renforcés.

## Fonctionnalités

### Modération et sécurité

- `/ban`, `/unban`, `/kick`, `/mute`, `/unmute`, `/timeout` et `/untimeout`.
- Avertissements, historique des sanctions et consultation avec `/modinfo`.
- Mute hybride : timeout Discord ou rôle dédié.
- AutoMod contre les liens, invitations, rafales, doublons, majuscules,
  mentions, mots interdits et raids.
- Mode observation, seuils, exemptions et sanctions propres à chaque règle.
- Journaux et archives configurables.
- Signalement d'un message ou d'un membre à l'équipe de modération.

### Configuration

- Panneau `/settings` réservé aux administrateurs.
- Navigation par domaines : sécurité, communauté et gestion du serveur.
- Interfaces Discord Components V2.
- Configuration des logs, tickets, anniversaires, XP, invitations, fuseau
  horaire, signalements et modération.
- Accès optionnel au dashboard web.

### Expérience

- Profils XP par serveur et classement paginé.
- Gain aléatoire de 15 à 25 XP par message admissible.
- Cooldown configurable, fixé à 5 secondes pour les nouvelles configurations.
- Récompenses de niveau et annonces automatiques.
- Boosts temporaires et boosts par rôle.
- Exclusions par salon et rôle.
- Journaux dédiés et interfaces Components V2.

### Invitations

- Synchronisation des invitations Discord existantes.
- Attribution des arrivées à leur inviteur.
- Classement paginé et statistiques individuelles.
- Annonces d'arrivée personnalisables.
- Suivi des créations, suppressions et utilisations de liens.
- Distinction entre arrivées suivies, membres présents et départs.

### Statistiques

- Résumé de l'activité du serveur.
- Courbes des messages, commandes, arrivées et départs.
- Classements des salons, membres et commandes les plus actifs.
- Périodes de 7 à 360 jours ou depuis toujours.
- Graphiques WebP mis en cache et adaptés à l'identité Kepler.

### Tickets et communauté

- Panneau de tickets personnalisable.
- Salons privés, rôle support, fermeture, réouverture et archivage.
- Export texte des conversations.
- Gestion et annonces d'anniversaires.
- Rappels personnels et fuseaux horaires IANA.
- Giveaways, quiz et jeux interactifs.

### Vie privée et exploitation

- Export et suppression des données personnelles avec `/mesdonnees`.
- RLS Supabase et fonctions sensibles réservées au service backend.
- Signalement centralisé des erreurs Discord.
- Déploiement Docker avec Deno et Discord.js.

## Commandes principales

### Administration et modération

```text
/settings                           Configuration complète du serveur
/graph                              Statistiques et graphiques serveur
/audit                              Vérification de la configuration
/ban, /kick, /mute, /timeout        Sanctions
/warn, /warnings, /modinfo          Avertissements et historique
/sanctions                          Gestion des sanctions enregistrées
/clear                              Suppression filtrée de messages
```

### Communauté et utilitaires

```text
/xp profil [membre]                 Profil et progression XP
/xp classement                      Classement XP paginé
/invitations membre [utilisateur]   Statistiques d'invitations
/invitations classement             Classement des inviteurs
/birthday                           Gestion des anniversaires
/reminder, /reminders               Rappels personnels
/userinfo, /serverinfo              Informations Discord
/channelinfo, /roleinfo, /rolelist  Informations du serveur
/report                             Signalement à la modération
```

Utilisez `/help` pour consulter les commandes disponibles sur votre instance.

## Roadmap

La roadmap publique couvre les versions V1.2 à V1.5 prévues entre août et
octobre 2026, les éventuelles versions intermédiaires et l'objectif Kepler 2.0
avec sharding en fin d'année.

➡️ [Consulter la roadmap détaillée](ROADMAP.md)

## Installation

Ajoutez Kepler à votre serveur depuis
[l'App Directory Discord](https://discord.com/application-directory/1208555753502412868).

Le bot doit disposer des permissions nécessaires aux modules activés. Le suivi
des invitations nécessite notamment **Gérer le serveur**.

## Technologies

- **Runtime :** Deno et TypeScript.
- **API Discord :** Discord.js 14.23.2.
- **Base de données :** Supabase/PostgreSQL.
- **Images :** Sharp, SVG et WebP.
- **Déploiement :** Docker et Dokploy.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Auto-modération](docs/AUTOMOD.md)
- [Graphiques](docs/GRAPH_COMMAND.md)
- [Invitations](docs/INVITE-MANAGER.md)
- [Système XP](docs/XP-SYSTEM.md)
- [Direction artistique](docs/DIRECTION-ARTISTIQUE.md)
- [Changelog](CHANGELOG.md)
- [Procédure de release](RELEASE.md)

## Contribution et retours

Les retours, propositions et rapports de bugs sont les bienvenus sur le
[serveur Discord](https://discord.gg/GbavRtUwad) ou dans les issues GitHub.

---

Kepler est développé avec ❤️ pour la communauté Discord française.
