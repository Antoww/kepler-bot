# Système d'expérience par serveur

## Fonctionnement

La progression est indépendante sur chaque serveur. Un membre gagne entre 15
et 25 XP pour un message éligible, avec un cooldown de 60 secondes. Les bots,
les messages de moins de trois caractères sans pièce jointe et les messages
envoyés pendant le cooldown ne donnent rien.

Le niveau est calculé à partir de l'XP cumulé :

```text
XP total requis pour le niveau N = 100 × N²
```

Ainsi, le niveau 1 commence à 100 XP, le niveau 2 à 400 XP, le niveau 3 à
900 XP, etc. Le coût additionnel augmente à chaque niveau.

## Commandes membres

- `/xp profil [membre]` affiche le niveau, le rang et la progression.
- `/xp classement` affiche les dix premiers membres du serveur.
- `/xpadmin reset utilisateur:<mention ou ID>` réinitialise un profil sur le
  serveur courant, même si l'utilisateur l'a quitté.

## Configuration administrateur

Toute la configuration est centralisée dans `/settings`, section
**Expérience** :

- **Général** : activation, cooldown en secondes et annonces de niveau.
  Un salon d'annonce peut être choisi ; sans configuration, l'annonce est
  envoyée dans le salon où le niveau est gagné.
- **Boosts** : période temporaire au format français `jj/mm/aaaa hh:mm`,
  interprétée dans le fuseau configuré pour le serveur, avec multiplicateur et
  boosts par rôle.
- **Récompenses** : association entre niveaux et rôles automatiques.
- **Exclusions** : salons et rôles qui ne peuvent pas gagner d'XP.

Pendant une période de boost, le multiplicateur temporaire est combiné au
meilleur boost de rôle du membre. Les boosts de plusieurs rôles ne se cumulent
pas entre eux.

Le rôle du bot doit être placé au-dessus des rôles de récompense. Lorsqu'un
membre rejoint de nouveau le serveur, Kepler consulte son profil local au
serveur et lui rend tous les rôles correspondant à son niveau.

## Installation

Exécuter les migrations suivantes dans Supabase avant de déployer le code :

1. `database/migrations/20260728_add_guild_xp_system.sql`
2. `database/migrations/20260728_extend_guild_xp_settings.sql`
3. `database/migrations/20260728_secure_guild_xp_rls.sql`
4. `database/migrations/20260728_fix_add_guild_xp_ambiguity.sql`
5. `database/migrations/20260728_add_xp_level_channel.sql`

La seconde est idempotente et peut aussi être appliquée à une installation
ayant déjà reçu la première version du système. Les ajouts d'XP passent par une
fonction SQL atomique afin d'éviter les doubles gains lors de messages
simultanés.

La RLS est activée sans policy publique : les clés `anon` et `authenticated`
ne peuvent lire ou modifier aucune donnée XP. Le bot doit utiliser
`SUPABASE_SERVICE_ROLE_KEY`, uniquement dans son environnement serveur.
