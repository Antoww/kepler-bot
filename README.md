# Kepler - Votre compagnon Discord polyvalent 🚀

**WARN : Bot actuellement en beta. Des instabilités et des redémarrages intempestifs sont à prévoir !**

Kepler est un bot Discord polyvalent en **développement actif**, conçu pour enrichir vos serveurs avec un système de modération avancé, des outils d'administration, la gestion d'anniversaires, et une variété de commandes fun. Écrit en TypeScript avec Deno et utilisant Supabase comme base de données, Kepler offre des performances optimales et une fiabilité accrue.

## 🌟 Points Forts

- **🛡️ Modération Professionnelle** : Système complet avec sanctions numérotées et logs automatiques
- **🎂 Gestion d'Anniversaires** : Notifications automatiques et configuration flexible  
- **⚙️ Administration Avancée** : Configuration granulaire et outils d'administration
- **🎮 Divertissement** : Large gamme de jeux et commandes interactives
- **🔧 TypeScript + Deno** : Code moderne, performant et sécurisé
- **💾 Base Supabase** : Stockage fiable avec PostgreSQL

---

## 🚀 Fonctionnalités

### 🛡️ Système de Modération Avancé
- **Commandes de base** : `/ban`, `/unban`, `/kick`, `/mute`, `/unmute`
- **Système d'avertissements** : `/warn`, `/unwarn`, `/warnings`
- **Gestion des sanctions** : Numérotation automatique, durées personnalisées
- **Système de mute hybride** : Timeout Discord (≤28j) ou rôles personnalisés (>28j)
- **Configuration flexible** : `/muteroleconfig` pour personnaliser le système de mute
- **Logs automatiques** : Suivi complet des actions de modération
- **Expirations automatiques** : Débannissement et démute automatiques

### 📌 Commandes Utilitaires
- **Informations serveur** : `/serverinfo`, `/channelinfo`, `/roleinfo`
- **Informations utilisateur** : `/userinfo`, `/rolelist`
- **Outils pratiques** : `/genpass`, `/minecraft-uuid`
- **Système de rappels** : `/reminder` pour ne rien oublier
- **Intégration WoW** : `/wowguilde` pour les guildes World of Warcraft

### 🎂 Système d'Anniversaires
- **Gestion complète** : Ajout, modification, suppression d'anniversaires
- **Notifications automatiques** : Souhaits d'anniversaire dans un canal dédié
- **Configuration flexible** : Canal personnalisable par serveur

### 🎉 Commandes Fun & Jeux
- **Jeux classiques** : `/coinflip`, `/chifoumi`, `/8ball`
- **Jeux avancés** : `/puissance4`, `/golem`
- **Divertissement** : `/blague`, `/meme`
- **Gifs et interactions** pour animer vos salons

### ⚙️ Administration & Configuration
- **Configuration des logs** : `/logconfig` pour personnaliser les journaux
- **Gestion des anniversaires** : `/bdayconfig` pour configurer le système
- **Annonces** : `/annonce` pour communiquer avec votre communauté
- **Système de permissions** avancé pour une administration sécurisée

---

## 🛠️ Roadmap

### ✅ Alpha (Terminé)
- **Passage en TypeScript** : ✅ Refonte complète du bot en TypeScript
- **Système de modération avancé** : ✅ Commandes complètes avec sanctions numérotées
- **Base de données Supabase** : ✅ Migration vers PostgreSQL
- **Système d'anniversaires** : ✅ Gestion complète des anniversaires
- **Logs de modération** : ✅ Système de journalisation configurable

### 🔄 Beta (En cours - Été 2025)
- **Optimisations performances** : Amélioration de la vitesse et stabilité
- **Nouvelles commandes fun** : Extension du catalogue de jeux
- **Système de niveaux** : XP et rangs pour les utilisateurs

### 🚀 Release (Été 2025)
- **Lancement officiel** de Kepler v1.0
- **Site web dédié** avec documentation complète
- **Support multilingue** : Français et Anglais

---

## 🎯 Commandes Principales

### Modération
```
/ban <utilisateur> [durée] [raison]     # Bannir un utilisateur
/kick <utilisateur> [raison]            # Expulser un utilisateur  
/mute <utilisateur> <durée> [raison]    # Rendre muet un utilisateur
/warn <utilisateur> [raison]            # Avertir un utilisateur
/warnings <utilisateur>                 # Voir les avertissements
/modinfo <numéro_sanction>             # Infos sur une sanction
```

### Administration
```
/muteroleconfig <set|create|disable>   # Configurer le système de mute
/logconfig <canal>                     # Configurer les logs
/bdayconfig <canal>                    # Configurer les anniversaires
/annonce <message>                     # Faire une annonce
```

### Utilitaires
```
/userinfo <utilisateur>                # Informations utilisateur
/serverinfo                           # Informations serveur
/reminder <durée> <message>           # Créer un rappel
/genpass [longueur]                   # Générer un mot de passe
```

---

## 🤝 Contribution
Votre avis compte ! Partagez vos retours, idées ou rapports de bugs en rejoignant notre serveur [Discord](https://discord.gg/GbavRtUwad) ou en créant une issue sur GitHub.

---

## 📥 Installation
Ajoutez Kepler à votre serveur en suivant [ce lien](https://discord.com/application-directory/1208555753502412868).

---

## 🔧 Technologies

- **Runtime** : Deno (TypeScript natif)
- **Framework** : Discord.js v14
- **Base de données** : Supabase (PostgreSQL)
- **Déploiement** : Docker
- **CI/CD** : GitHub Actions

---

*Kepler est développé avec ❤️ pour la communauté Discord française*
