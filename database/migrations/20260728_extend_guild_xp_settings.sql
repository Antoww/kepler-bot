-- Extension idempotente pour les installations ayant déjà appliqué la
-- migration XP initiale.
alter table public.guild_xp_settings
    add column if not exists level_up_channel_id text,
    add column if not exists xp_log_channel_id text,
    add column if not exists cooldown_seconds integer not null default 60,
    add column if not exists boost_multiplier numeric(5,2) not null default 1,
    add column if not exists boost_starts_at timestamptz,
    add column if not exists boost_ends_at timestamptz,
    add column if not exists boost_end_notified_at timestamptz,
    add column if not exists excluded_channel_ids text[] not null default '{}',
    add column if not exists excluded_role_ids text[] not null default '{}';

do $$
begin
    if not exists (
        select 1 from pg_constraint where conname = 'guild_xp_settings_cooldown_check'
    ) then
        alter table public.guild_xp_settings
            add constraint guild_xp_settings_cooldown_check
            check (cooldown_seconds between 0 and 86400);
    end if;
    if not exists (
        select 1 from pg_constraint where conname = 'guild_xp_settings_boost_check'
    ) then
        alter table public.guild_xp_settings
            add constraint guild_xp_settings_boost_check
            check (boost_multiplier between 1 and 100);
    end if;
end $$;

create table if not exists public.guild_xp_role_boosts (
    guild_id text not null,
    role_id text not null,
    multiplier numeric(5,2) not null check (multiplier > 1 and multiplier <= 100),
    created_at timestamptz not null default now(),
    primary key (guild_id, role_id)
);
