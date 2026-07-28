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

La migration XP principale contient déjà la structure finale, la RLS et la
fonction corrigée. Les migrations `extend`, `fix` et `secure` sont uniquement
des correctifs idempotents pour les bases ayant reçu une version antérieure.

## Mise à niveau d’une installation existante

Appliquer tout fichier non encore exécuté. Les migrations utilisent
`if not exists` ou `create or replace` lorsqu’une réexécution doit être sûre.
