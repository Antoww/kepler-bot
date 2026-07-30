# Release Kepler 1.0.0

Ce document décrit la promotion de la branche `v1.0.0` vers la production.
Dokploy déploie l'environnement de développement depuis `main` et la production
depuis un tag Git sélectionné manuellement.

## Avant le merge

- [x] `version.json` annonce `1.0.0` et le canal stable
- [x] `CHANGELOG.md` et `changelogs/v1.0.0.md` sont à jour
- [x] La note Discord est prête dans `DISCORD_RELEASE_1.0.0.md`
- [x] L'ordre des migrations Supabase est documenté
- [ ] Le type-check Deno passe
- [ ] L'image Docker se construit
- [ ] La branche de développement a été testée avec les services externes
- [ ] La PR `v1.0.0` vers `main` est approuvée et fusionnée

## Préparer Supabase PROD

1. Faire une sauvegarde de la base.
2. Suivre `database/migrations/README.md` et appliquer chaque migration
   manquante dans l'ordre.
3. Vérifier que les nouvelles tables ont la RLS activée.
4. Vérifier que Kepler utilise la clé serveur `SUPABASE_SERVICE_ROLE_KEY`.

## Variables Dokploy PROD

Reprendre `.env.example` et vérifier au minimum :

```env
TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BLAGUES_API_TOKEN=
LOG_LEVEL=INFO
DISCORD_ERROR_REPORTER_TEST=false
```

Variables optionnelles : `PASTEBIN_API_KEY`, `ERROR_CHANNEL_ID` et
`DASHBOARD_URL`. Ne pas activer `DISCORD_ERROR_REPORTER_TEST` en production.

## Tag et release GitHub

Le tag doit être créé uniquement sur le commit de merge présent dans `main` :

```bash
git switch main
git pull --ff-only origin main
git tag -a v1.0.0 -m "Kepler 1.0.0"
git push origin v1.0.0
```

Créer ensuite la release GitHub `v1.0.0` en copiant le contenu de
`changelogs/v1.0.0.md`. Ne pas marquer la release comme pre-release.

## Déploiement Dokploy

1. Ouvrir le service Kepler PROD.
2. Sélectionner le tag `v1.0.0`.
3. Construire et déployer l'image.
4. Contrôler les logs de démarrage et la connexion Discord.
5. Vérifier `/help`, `/settings`, `/xp` et `/invitations` sur un serveur pilote.
6. Vérifier la création d'un ticket et les logs d'auto-modération.
7. Publier `DISCORD_RELEASE_1.0.0.md` après validation.

## Retour arrière

En cas d'incident, redéployer le tag stable précédent dans Dokploy. Les
migrations 1.0.0 sont additives : ne supprimer aucune table ni colonne pendant
le rollback. Désactiver les nouvelles fonctions dans `/settings` le temps du
diagnostic.
