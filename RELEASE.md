# 🚀 Release Beta 1.3 - Guide

## 📋 Version actuelle : **v0.1.3** (Beta 1.3)

### Workflow avec Dokploy

Le bot utilise **Dokploy** pour le déploiement automatisé avec deux environnements :

- **DEV** : Auto-deploy sur chaque push vers `main`
- **PROD** : Deploy manuel ou sur tag Git

---

## 🔧 Procédure de Release

### 1. Développement sur DEV

```bash
# Faire vos modifications
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin main
```

→ Dokploy **DEV** se met à jour automatiquement

### 2. Préparer la release

**Mettre à jour la version manuellement** :

Éditer [version.json](version.json) :
```json
{
  "version": "0.1.3",
  "codename": "Kepler Beta",
  "releaseDate": "2026-01-05",
  "changelog": "Beta 1.3 - Statistiques, RGPD et optimisations"
}
```

Éditer [CHANGELOG.md](CHANGELOG.md) : Ajouter la section pour la nouvelle version

### 3. Commit et Tag

```bash
# Commit la nouvelle version
git add version.json CHANGELOG.md
git commit -m "chore: bump version to 0.1.3"
git push origin main

# Créer le tag Git
git tag -a v0.1.3 -m "Beta 1.3 - Statistiques, RGPD et optimisations"
git push origin v0.1.3
```

### 4. Déployer en PROD sur Dokploy

**Option A : Deploy automatique sur tag** (si configuré dans Dokploy)
- Le tag `v0.1.3` déclenche automatiquement le deploy PROD

**Option B : Deploy manuel** (recommandé pour contrôle)
1. Aller sur Dokploy → Projet "Kepler Bot" → Environnement PROD
2. Sélectionner le tag `v0.1.3` dans la liste des branches/tags
3. Cliquer sur "Deploy"
4. Dokploy rebuild et redéploie automatiquement

---

## 🏗️ Architecture Dokploy

### Environnements configurés

**🧪 DEV (développement)**
- **Branch** : `main`
- **Auto-deploy** : ✅ Oui (sur chaque push)
- **Variables d'env** : Token test, base de données dev
- **URL** : Votre URL dev Dokploy

**🚀 PROD (production)**
- **Branch/Tag** : Tags Git (`v*.*.*`)
- **Auto-deploy** : ⚠️ Recommandé manuel
- **Variables d'env** : Token production, base de données prod
- **URL** : Votre URL prod Dokploy

### Dockerfile utilisé par Dokploy

Le [Dockerfile](Dockerfile) actuel est optimisé pour Dokploy :
- Base : `denoland/deno:2.1.7`
- Cache des dépendances
- Healthcheck intégré
- Variable `VERSION` injectée

---

## 📦 Gestion des versions

### Format Beta : `0.x.y`
- `x` = version mineure (nouvelles features)
- `y` = version patch (corrections de bugs)

**Exemples** :
- `0.1.3` → `0.1.4` : Patch (bug fix)
- `0.1.3` → `0.2.0` : Minor (nouvelle feature)
- `0.1.3` → `1.0.0` : Major (release stable)

### Script de bump (optionnel)

Pour automatiser localement :
```bash
deno run --allow-read --allow-write bump-version.ts patch
```

> ⚠️ La version dans `version.json` est affichée dans `/help` et `/botstats`

---

## ✅ Checklist de Release

- [x] Version mise à jour dans `version.json` (0.1.3)
- [x] Changelog mis à jour dans `CHANGELOG.md`
- [x] Dockerfile optimisé
- [ ] Tests passés sur environnement DEV
- [ ] Commit des modifications
- [ ] Tag Git créé (`v0.1.3`)
- [ ] Tag poussé vers GitHub
- [ ] Deploy PROD via Dokploy
- [ ] Vérification post-déploiement

---

## 🔄 Workflow complet

```
┌─────────────┐
│   Coding    │
│   Locally   │
└──────┬──────┘
       │
       │ git push main
       │
       ▼
┌─────────────┐
│   GitHub    │
│    main     │
└──────┬──────┘
       │
       │ Auto-deploy
       │
       ▼
┌─────────────┐
│  Dokploy    │
│    DEV      │  ← Tests et validation
└──────┬──────┘
       │
       │ Quand prêt
       │
       ├─ git tag v0.1.3
       ├─ git push --tags
       │
       ▼
┌─────────────┐
│   GitHub    │
│   v0.1.3    │
└──────┬──────┘
       │
       │ Deploy manuel
       │
       ▼
┌─────────────┐
│  Dokploy    │
│    PROD     │  ← En production
└─────────────┘
```

---

## 🔧 Configuration Dokploy recommandée

### Environnement DEV
```yaml
Branch: main
Auto Deploy: ON
Build Command: (default - docker build)
Health Check: ON
```

### Environnement PROD
```yaml
Branch: tags/v*
Auto Deploy: OFF (recommandé)
Build Command: (default - docker build)
Health Check: ON
```

---

## 🆘 Dépannage

### Le deploy DEV ne se déclenche pas
- Vérifier les webhooks GitHub → Dokploy
- Vérifier les logs de build dans Dokploy
- Forcer un rebuild manuel

### Les variables d'environnement ne sont pas prises
- Vérifier la config dans Dokploy → Environment Variables
- Redéployer après modification des variables

### Le tag ne s'affiche pas dans Dokploy
```bash
# Vérifier que le tag est bien poussé
git ls-remote --tags origin

# Attendre quelques secondes
# Rafraîchir la page Dokploy
```

### Rollback vers une version antérieure
1. Aller sur Dokploy → PROD
2. Sélectionner le tag `v0.1.2` dans la liste
3. Cliquer sur "Deploy"
4. Dokploy redéploie automatiquement l'ancienne version

---

## 📝 Notes importantes

- **Pas besoin de GitHub Actions** : Dokploy gère tout le CI/CD
- **Le Dockerfile est utilisé directement** par Dokploy
- **Les tags Git sont la source de vérité** pour les versions
- **Chaque environnement a ses propres variables** (tokens, DB, etc.)
- **Le healthcheck permet à Dokploy** de vérifier que le bot est actif

---

## 🎯 Pour cette release Beta 1.3

```bash
# 1. Vérifier que DEV fonctionne bien
# (déjà déployé automatiquement)

# 2. Créer le tag
git tag -a v0.1.3 -m "Beta 1.3 - Statistiques, RGPD et optimisations"
git push origin v0.1.3

# 3. Aller sur Dokploy
# → Projet "Kepler Bot"
# → Environnement PROD
# → Sélectionner tag "v0.1.3"
# → Cliquer "Deploy"

# 4. Vérifier
# → Logs de build
# → Bot en ligne sur Discord
# → /help affiche "v0.1.3 • Kepler Beta"
```

