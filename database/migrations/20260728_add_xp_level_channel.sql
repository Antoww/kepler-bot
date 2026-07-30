-- Migration idempotente pour les installations XP existantes.
alter table public.guild_xp_settings
    add column if not exists level_up_channel_id text;
