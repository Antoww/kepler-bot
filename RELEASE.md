# Release Kepler 1.0.1

Ce document décrit la promotion de la branche `v1.0.1` vers la production.
Dokploy déploie l'environnement de développement depuis `main` et la production
depuis un tag Git sélectionné manuellement.

## Avant le merge

- [x] `version.json` annonce `1.0.1` et le canal stable
- [x] `CHANGELOG.md` et `changelogs/v1.0.1.md` sont à jour
- [x] La note Discord est prête dans `DISCORD_RELEASE_1.0.1.md`
- [x] Aucune migration Supabase supplémentaire n'est nécessaire
- [ ] Le type-check Deno passe
- [ ] L'image Docker se construit
- [ ] La branche de développement a été testée avec les services externes
- [ ] `/invitations classement` récupère les invitations Discord existantes
- [ ] La PR `v1.0.1` vers `main` est approuvée et fusionnée

## Supabase PROD

Aucune nouvelle migration n'est requise depuis la version 1.0.0. Vérifier que
Kepler utilise toujours la clé serveur `SUPABASE_SERVICE_ROLE_KEY`.

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
git tag -a v1.0.1 -m "Kepler 1.0.1"
git push origin v1.0.1
```

Créer ensuite la release GitHub `v1.0.1` en copiant le contenu de
`changelogs/v1.0.1.md`. Ne pas marquer la release comme pre-release.

## Déploiement Dokploy

1. Ouvrir le service Kepler PROD.
2. Sélectionner le tag `v1.0.1`.
3. Construire et déployer l'image.
4. Contrôler les logs de démarrage et la connexion Discord.
5. Vérifier `/help`, `/settings` et `/invitations` sur un serveur pilote.
6. Vérifier le classement avec une invitation créée avant le déploiement.
7. Publier `DISCORD_RELEASE_1.0.1.md` après validation.

## Retour arrière

En cas d'incident, redéployer le tag stable `v1.0.0` dans Dokploy. La version
1.0.1 n'ajoute aucune migration et ne nécessite aucun retour arrière de base de
données.
