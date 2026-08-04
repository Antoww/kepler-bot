# Migrations Supabase

Les migrations sont conservées car certaines installations ont reçu des
versions intermédiaires. Elles doivent être appliquées dans l’ordre
chronologique du nom de fichier.

## Installation neuve

1. `20260728_add_ticket_settings.sql`
2. `20260728_add_guild_xp_system.sql`
3. `20260728_add_server_timezone.sql`
4. `20260728_add_xp_level_channel.sql`
5. `20260728_add_xp_logs.sql`
6. `20260728_add_invite_manager.sql`
7. `20260728_add_automod_system.sql`
8. `20260804_extend_automod_v1_1.sql`
8. `20260729_track_ticket_panel_message.sql`

La migration XP principale contient déjà la structure finale, la RLS et la
fonction corrigée. Les migrations `extend`, `fix` et `secure` sont uniquement
des correctifs idempotents pour les bases ayant reçu une version antérieure.

## Mise à niveau d’une installation existante

Appliquer tout fichier non encore exécuté. Les migrations utilisent
`if not exists` ou `create or replace` lorsqu’une réexécution doit être sûre.

## Passage en production 1.0.0

1. Créer une sauvegarde de la base Supabase de production.
2. Relever les migrations déjà appliquées.
3. Exécuter les fichiers manquants dans l'ordre ci-dessus.
4. Pour une base ayant reçu une version XP intermédiaire, exécuter aussi, dans
   cet ordre, `20260728_extend_guild_xp_settings.sql`,
   `20260728_fix_add_guild_xp_ambiguity.sql`, puis
   `20260728_secure_guild_xp_rls.sql`.
5. Vérifier que les tables `guild_xp_*`, `guild_invite_*` et
   `guild_automod_*` existent et que la RLS est active.
6. Démarrer Kepler avec `SUPABASE_SERVICE_ROLE_KEY` et contrôler les logs de
   connexion avant d'activer les nouvelles fonctions serveur par serveur.

Ne jamais exécuter ces migrations avec une clé client `anon` et ne jamais
copier la clé `service_role` dans un dashboard ou une application cliente.
