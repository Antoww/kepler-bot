# Kepler - Votre compagnon Discord polyvalent 🚀

**WARN : Bot actuellement en beta. Des instabilités et des redémarrages intempestifs sont à prévoir !**

Kepler est un bot Discord polyvalent en **développement actif**, conçu pour enrichir vos serveurs avec un système de modération avancé, des outils d'administration, la gestion d'anniversaires, et une variété de commandes fun. Écrit en TypeScript avec Deno et utilisant Supabase comme base de données, Kepler offre des performances optimales et une fiabilité accrue.

## 🌟 Points Forts

- **🛡️ Modération Professionnelle** : Système complet avec sanctions numérotées et logs automatiques
- **🎂 Gestion d'Anniversaires** : Notifications automatiques et configuration flexible  
- **⚙️ Administration Avancée** : Configuration granulaire et outils d'administration
- **🎮 Divertissement** : Large gamme de jeux et commandes interactives
- **🔧 TypeScript + Deno** : Code moderne, performant et sécurisé

---

## 🚀 Fonctionnalités

### 🛡️ Système de Modération Avancé
- **Commandes de base** : `/ban`, `/unban`, `/kick`, `/mute`, `/unmute`, `/timeout`, `/untimeout`
- **Système d'avertissements** : `/warn`, `/warnings`
- **Gestion des sanctions** : Numérotation automatique, historique complet avec `/modinfo`
- **Gestion personnalisée** : `/sanctions voir` et `/sanctions supprimer` pour gérer les historiques
- **Système de mute hybride** : Timeout Discord (≤28j) ou rôles personnalisés (>28j)
- **Configuration flexible** : `/muteroleconfig` pour personnaliser le système de mute
- **Logs automatiques** : Suivi complet des actions de modération via `/moderationconfig`
- **Expirations automatiques** : Débannissement et démute automatiques
- **Audit serveur** : `/audit` pour vérifier la configuration des canaux et rôles

### 📌 Commandes Utilitaires
- **Informations serveur** : `/serverinfo`, `/channelinfo`, `/roleinfo`, `/rolelist`
- **Informations utilisateur** : `/userinfo`
- **Outils pratiques** : `/genpass`, `/minecraft-uuid`
- **Système de rappels** : `/reminder`, `/reminders` pour ne rien oublier

### 🎂 Système d'Anniversaires
- **Gestion complète** : Ajout, modification, suppression d'anniversaires
- **Notifications automatiques** : Souhaits d'anniversaire dans un canal dédié
- **Configuration flexible** : Canal personnalisable par serveur

### 🎉 Commandes Fun & Jeux
- **Jeux classiques** : `/coinflip`, `/chifoumi`, `/8ball`
- **Jeux avancés** : `/puissance4`, `/golem`
- **Jeu de comptage** : `/count` pour un mini-jeu collaboratif
- **Divertissement** : `/blague`, `/meme`

### ⚙️ Administration & Configuration
- **Configuration des logs** : `/logconfig` pour personnaliser les journaux serveur
- **Configuration des anniversaires** : `/bdayconfig` pour configurer le système
- **Configuration des mutes** : `/muteroleconfig` pour le système de mute hybride
- **Configuration de la modération** : `/moderationconfig` pour les logs de modération
- **Annonces** : `/annonce` pour communiquer avec votre communauté
- **Audit serveur** : `/audit` pour vérifier la configuration complète
- **Gestion des anniversaires** : `/birthday` pour ajouter/modifier/supprimer des anniversaires
- **Système de permissions** avancé pour une administration sécurisée

---

## 🛠️ Roadmap

### ✅ Alpha (Terminé)
- **Passage en TypeScript** : ✅ Refonte complète du bot en TypeScript
- **Système de modération avancé** : ✅ Commandes complètes avec sanctions numérotées
- **Base de données Supabase** : ✅ Migration vers PostgreSQL
- **Système d'anniversaires** : ✅ Gestion complète des anniversaires
- **Logs de modération** : ✅ Système de journalisation configurable

### 🔄 Beta 1.3 (En cours - Janvier 2026)
- **Audit serveur avancé** : ✅ Vérification automatique de la configuration
- **Gestion personnalisée des sanctions** : ✅ Suppression et visualisation des sanctions
- **Jeu de comptage collaboratif** : ✅ Mini-jeu `/count` pour les serveurs
- **Timeout Discord** : ✅ Support complet de la nouvelle fonctionnalité de timeout Discord
- **Historique détaillé** : ✅ `/modinfo` avec suivi complet des sanctions
- **Optimisations performances** : 🔧 Amélioration de la vitesse et stabilité
- **Nouvelles commandes fun** : 🔧 Extension du catalogue de jeux
- **Gestion des événements serveur** : 🔧 Logs enrichis pour tous les événements

### 🚀 Release (Janvier/Février 2026)
- **Lancement officiel** de Kepler v1.0
- **Site web dédié** avec documentation complète
- **Système de niveaux** : XP et rangs pour les utilisateurs

---

## 🎯 Commandes Principales

### Modération
```
/ban <utilisateur> [durée] [raison]     # Bannir un utilisateur
/unban <user_id> [raison]               # Débannir un utilisateur
/kick <utilisateur> [raison]            # Expulser un utilisateur  
/mute <utilisateur> <durée> [raison]    # Rendre muet un utilisateur
/unmute <utilisateur> [raison]          # Annuler le mute
/timeout <utilisateur> <durée> [raison] # Timeout Discord
/untimeout <utilisateur> [raison]       # Retirer le timeout
/warn <utilisateur> <raison>            # Avertir un utilisateur
/warnings <utilisateur>                 # Voir les avertissements
/modinfo <utilisateur>                  # Infos complètes de modération
/sanctions voir <utilisateur>           # Voir toutes les sanctions
/sanctions supprimer <numero>           # Supprimer une sanction
```

### Administration
```
/muteroleconfig set <role>              # Configurer le rôle de mute
/muteroleconfig create [nom]            # Créer un rôle de mute
/muteroleconfig disable                 # Désactiver le rôle de mute
/moderationconfig <canal>               # Configurer les logs de modération
/logconfig <canal>                      # Configurer les logs du serveur
/bdayconfig <canal>                     # Configurer le canal des anniversaires
/annonce <message>                      # Faire une annonce
/audit channel                          # Auditer les canaux configurés
/audit roles                            # Auditer les rôles configurés
```

### Utilitaires
```
/userinfo <utilisateur>                # Informations utilisateur
/serverinfo                            # Informations serveur
/channelinfo <canal>                   # Informations canal
/roleinfo <rôle>                       # Informations rôle
/rolelist                              # Liste des rôles du serveur
/reminder <durée> <message>            # Créer un rappel personnel
/reminders                             # Voir vos rappels
/birthday add <date> [notes]           # Ajouter un anniversaire
/birthday remove <utilisateur>         # Retirer un anniversaire
/birthday list                         # Voir tous les anniversaires
/genpass [longueur]                    # Générer un mot de passe
/minecraft-uuid <pseudo>               # Obtenir l'UUID Minecraft
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
