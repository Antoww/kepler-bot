# Changelogs

Ce dossier contient les changelogs détaillés pour chaque version de Kepler Bot.

## 📋 Structure

Chaque version a son propre fichier markdown avec :
- Résumé de la release
- Nouvelles fonctionnalités détaillées
- Améliorations et optimisations
- Corrections de bugs
- Notes de migration
- Liens vers la documentation

## 🗂️ Index des versions

### Stable
- [v1.0.1](v1.0.1.md) - 31 juillet 2026 - **Correctif 1.0.1** ✅ Actuelle
  - Récupération des invitations déjà présentes
  - Classement et statistiques corrigés sans double comptage
  - Identité visuelle des embeds harmonisée
- [v1.0.0](v1.0.0.md) - 30 juillet 2026 - **Première version stable**
  - XP, tickets, invitations et auto-modération
  - Configuration centralisée avec `/settings`

### Beta
- [v0.1.5](v0.1.5.md) - 28 juillet 2026 - **Beta 1.5**
  - Système complet de tickets
  - Archives et logs d’état
  - Sécurité et panneaux `/settings` renforcés
- [v0.1.3](v0.1.3.md) - 5 janvier 2026 - **Beta 1.3**
  - Statistiques avancées (`/graph`)
  - RGPD complet (`/mesdonnees`)
  - Optimisations images WebP
  - Système de versioning

## 📝 Format

Les changelogs suivent le format [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) avec des sections :

- ✨ **Ajouté** : Nouvelles fonctionnalités
- 🔧 **Modifié** : Changements dans les fonctionnalités existantes
- 🐛 **Corrigé** : Corrections de bugs
- 🔒 **Sécurité** : Corrections de vulnérabilités
- ⚡ **Performance** : Améliorations de performance
- 📚 **Documentation** : Changements dans la documentation
- 🗑️ **Supprimé** : Fonctionnalités retirées

## 🔗 Liens utiles

- [CHANGELOG.md principal](../CHANGELOG.md) - Vue d'ensemble de toutes les versions
- [RELEASE.md](../RELEASE.md) - Guide de release et workflow Dokploy
- [version.json](../version.json) - Version actuelle du bot

## 🚀 Prochaines versions

Les versions futures suivront le format SemVer :
- **0.x.y** : Versions beta
- **1.0.0** : Première version stable
- **1.x.0** : Nouvelles fonctionnalités (minor)
- **1.0.x** : Corrections de bugs (patch)
