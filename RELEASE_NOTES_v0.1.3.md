# 🚀 Kepler Bot - Beta 1.3 (v0.1.3)

> **Codename:** Kepler Beta  
> **Date:** 5 janvier 2026  
> **Type:** Beta Release

Cette release se concentre sur trois axes majeurs : **statistiques avancées**, **conformité RGPD**, et **optimisations techniques**.

---

## ✨ Nouveautés principales

### 📊 Système de statistiques avancé
- **Nouvelle commande `/graph`** (owner uniquement) avec 5 types de graphiques :
  - 📈 Commandes les plus utilisées (top 15, 30 derniers jours)
  - 📨 Volume de messages par jour (historique 30 jours)
  - 👥 Utilisateurs actifs par jour (timeline 30 jours)
  - 📊 Tendances hebdomadaires (comparaison semaine actuelle vs précédente)
  - 🌍 Vue d'ensemble globale (métriques clés)
- Tracking automatique en temps réel des commandes et messages
- Agrégation quotidienne avec métriques détaillées

### 🔐 RGPD & Protection des données
- **Nouvelle commande `/mesdonnees`** pour tous les utilisateurs :
  - `voir` : Résumé complet de vos données stockées
  - `exporter` : Export JSON via Pastebin (portabilité des données)
  - `supprimer` : Effacement de toutes vos données personnelles
  - `info` : Informations sur la conservation des données
- Conformité complète : accès, portabilité, effacement, limitation
- **Purge automatique** : 90 jours pour les stats, 2 ans pour la modération
- Couverture totale : stats, anniversaires, rappels, modération, participations

### 🎯 Système de versioning
- Affichage de la version dans `/help` et `/botstats`
- Version visible dans le statut Discord du bot
- Changelog structuré avec détails par version dans `changelogs/`

---

## 🔧 Améliorations & Optimisations

### ⚡ Images WebP (commande `/couple`)
- **Réduction de 60-70% de la bande passante** :
  - Format PNG → **WebP** (compression optimale)
  - Avatars 512px → **128px** (qualité suffisante)
  - **~27KB → ~10-15KB** par image générée
- **Cache intelligent** : 5 minutes de TTL, évite les regénérations inutiles

### 🏓 Latence améliorée (commande `/ping`)
- Mesure **round-trip réelle** avec calcul précis
- Gestion des cas `-1ms` (websocket non initialisé)
- Layout optimisé pour tous les appareils

### 🖥️ Compatibilité Deno
- Remplacement de `process.cpuUsage()` par `Deno.loadavg()`
- Plus de warnings dans la console
- Performance système correctement affichée

---

## 🐛 Corrections

- ✅ **Fix RLS Supabase** : Policies bloquant les inserts de stats
- ✅ **Fix latence -1ms** : Gestion correcte des valeurs invalides
- ✅ **Fix layout embeds** : Suppression des spacer fields forcés
- ✅ **Fix warning Deno** : Compatibilité `process.cpuUsage()`

---

## 📚 Documentation

- ✅ **5 READMEs complets** : commands/, database/, utils/, events/, docs/
- ✅ **Guide de release** : RELEASE.md avec workflow Dokploy
- ✅ **Changelogs détaillés** : Dossier `changelogs/` avec versionning
- ✅ **Index des commandes** : Table complète des 40+ commandes

---

## 📊 Base de données

**Nouvelles tables** :
- `command_stats` : Tracking des commandes exécutées
- `message_stats` : Tracking des messages envoyés
- `daily_stats` : Agrégation quotidienne par serveur
- `global_daily_stats` : Métriques globales journalières

**RLS renforcé** sur toutes les 15 tables Supabase.

---

## 🎮 Commandes disponibles

**40+ commandes** réparties en 5 catégories :
- 🛡️ **Administration** : graph, annonce, audit, giveaway, configurations...
- 🎲 **Jeux** : couple, puissance4, 8ball, chifoumi, coinflip, memes...
- 👮 **Modération** : ban, kick, mute, timeout, warn, sanctions, clear...
- 🛠️ **Utilitaires** : info, birthday, reminder, lyrics, mesdonnees, qrcode...
- 📖 **Générales** : help, ping, stats, credits...

---

## 🔗 Liens utiles

- 📖 [Changelog détaillé](changelogs/v0.1.3.md)
- 📋 [Liste des commandes](commands/README.md)
- 🗄️ [Structure base de données](database/README.md)
- 🚀 [Guide de release](RELEASE.md)

---

## 📦 Installation & Déploiement

### Avec Dokploy (recommandé)
```bash
# 1. Sélectionner le tag v0.1.3 dans l'interface Dokploy
# 2. Cliquer sur "Deploy"
# 3. Dokploy build et déploie automatiquement
```

### Avec Docker
```bash
docker pull ghcr.io/antoww/kepler-bot:v0.1.3
docker run -d --name kepler-bot --env-file .env ghcr.io/antoww/kepler-bot:v0.1.3
```

### Variables d'environnement requises
```env
TOKEN=votre_token_discord
SUPABASE_URL=votre_url_supabase
SUPABASE_KEY=votre_clé_supabase
BLAGUES_API_TOKEN=votre_token_blagues_api
PASTEBIN_API_KEY=votre_clé_pastebin
```

---

## ⚠️ Notes de migration

### Pour les utilisateurs
- La commande `/mesdonnees` est maintenant disponible pour gérer vos données
- Les stats anciennes (>90 jours) seront automatiquement purgées
- Aucune action requise, tout est automatique ✅

### Pour les administrateurs
- Les nouvelles tables sont créées automatiquement au démarrage
- Les graphiques nécessitent ~24h de données pour être pertinents
- Le statut Discord affiche maintenant "v0.1.3 • Kepler Beta"

---

## 🎯 Prochaines étapes (v0.2.0)

- Dashboard web pour visualiser les statistiques
- API REST pour les stats
- Système de backup automatique
- Export des graphiques en images
- Cache Redis pour optimiser les performances

---

## 💬 Support

- **Issues** : [GitHub Issues](https://github.com/Antoww/kepler-bot/issues)
- **Discord** : Serveur de support disponible
- **Documentation** : Consultez les READMEs dans chaque dossier

---

**Merci d'utiliser Kepler Bot !** 🚀

---

## Checksums

**Version** : `0.1.3`  
**Codename** : `Kepler Beta`  
**Date** : `2026-01-05`  
**Docker Image** : `ghcr.io/antoww/kepler-bot:v0.1.3`
