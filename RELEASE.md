# Release Kepler 1.1.0

Ce document décrit la promotion de la branche `v1.1` vers la production.
Dokploy déploie l'environnement de développement depuis `main` et la production
depuis un tag Git sélectionné manuellement.

## Avant le merge

- [x] `version.json` annonce `1.1.0` et la date de publication.
- [x] `README.md`, `ROADMAP.md` et `CHANGELOG.md` sont à jour.
- [x] Les notes détaillées sont prêtes dans `changelogs/v1.1.0.md`.
- [x] La note Discord est prête dans `DISCORD_RELEASE_1.1.0.md`.
- [ ] La checklist de qualification V1.1 est validée sur le bot de test.
- [ ] Les trois migrations Supabase V1.1 sont appliquées en préproduction.
- [ ] Le type-check Deno passe ou les erreurs historiques sont explicitement
  acceptées.
- [ ] L'image Docker se construit avec Noto Color Emoji.
- [ ] La branche a été testée avec Discord et Supabase.
- [ ] La PR `v1.1` vers `main` est approuvée et fusionnée.

## Supabase PROD

Sauvegarder la base puis appliquer les migrations dans cet ordre :

1. `20260804_extend_automod_v1_1.sql`
2. `20260805_add_member_flow_stats.sql`
3. `20260806_set_default_xp_cooldown.sql`

Contrôler ensuite :

- les nouveaux réglages AutoMod sur un serveur pilote ;
- la fonction d'agrégation des arrivées et départs ;
- la valeur par défaut de `guild_xp_settings.cooldown_seconds` ;
- la conservation du cooldown des configurations XP existantes.

Les fonctions sensibles doivent rester accessibles uniquement au rôle
`service_role`.

## Variables Dokploy PROD

Reprendre la configuration de production et vérifier au minimum :

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

## Vérifications Discord

Sur un serveur pilote :

1. Vérifier les permissions du bot, notamment **Gérer le serveur**, **Gérer les
   messages** et la hiérarchie des rôles.
2. Ouvrir `/settings` et parcourir chaque catégorie Components V2.
3. Activer l'AutoMod en mode observation avant toute sanction réelle.
4. Générer chaque type de graphique, dont les arrivées et départs.
5. Tester `/xp profil`, `/xp classement` et la pagination.
6. Tester `/invitations membre`, `/invitations classement` et la pagination.
7. Vérifier une annonce de niveau et un journal XP.
8. Contrôler le rendu sur Discord desktop et mobile.

## Tag et release GitHub

Le tag doit être créé uniquement sur le commit de merge présent dans `main` :

```bash
git switch main
git pull --ff-only origin main
git tag -a v1.1.0 -m "Kepler 1.1.0"
git push origin v1.1.0
```

Créer ensuite la release GitHub `v1.1.0` en copiant le contenu de
`changelogs/v1.1.0.md`. Ne pas marquer la release comme pre-release.

## Déploiement Dokploy

1. Ouvrir le service Kepler PROD.
2. Sélectionner le tag `v1.1.0`.
3. Construire et déployer l'image.
4. Contrôler les logs de démarrage, Discord et Supabase.
5. Exécuter la vérification rapide sur le serveur pilote.
6. Surveiller les erreurs AutoMod, XP et invitations.
7. Publier `DISCORD_RELEASE_1.1.0.md` après validation.

## Retour arrière

En cas d'incident applicatif, redéployer le tag stable `v1.0.1` dans Dokploy.

Les migrations V1.1 ne doivent pas être supprimées automatiquement pendant le
rollback : elles ajoutent des colonnes et fonctions compatibles avec l'ancienne
version. Restaurer une sauvegarde Supabase uniquement si une migration a échoué
ou si son impact sur les données a été confirmé.
