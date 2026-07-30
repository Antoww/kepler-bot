-- Progression XP isolée par serveur.
create table if not exists public.guild_xp_profiles (
    guild_id text not null,
    user_id text not null,
    xp bigint not null default 0 check (xp >= 0),
    level integer not null default 0 check (level >= 0),
    message_count bigint not null default 0 check (message_count >= 0),
    last_xp_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (guild_id, user_id)
);

create index if not exists guild_xp_profiles_leaderboard_idx
    on public.guild_xp_profiles (guild_id, xp desc);

create table if not exists public.guild_xp_rewards (
    guild_id text not null,
    level integer not null check (level > 0),
    role_id text not null,
    created_at timestamptz not null default now(),
    primary key (guild_id, level),
    unique (guild_id, role_id)
);

create table if not exists public.guild_xp_settings (
    guild_id text primary key,
    enabled boolean not null default true,
    announce_level_up boolean not null default true,
    level_up_channel_id text,
    xp_log_channel_id text,
    cooldown_seconds integer not null default 60 check (cooldown_seconds between 0 and 86400),
    boost_multiplier numeric(5,2) not null default 1 check (boost_multiplier between 1 and 100),
    boost_starts_at timestamptz,
    boost_ends_at timestamptz,
    boost_end_notified_at timestamptz,
    excluded_channel_ids text[] not null default '{}',
    excluded_role_ids text[] not null default '{}',
    updated_at timestamptz not null default now()
);

create table if not exists public.guild_xp_role_boosts (
    guild_id text not null,
    role_id text not null,
    multiplier numeric(5,2) not null check (multiplier > 1 and multiplier <= 100),
    created_at timestamptz not null default now(),
    primary key (guild_id, role_id)
);

-- Les données XP ne sont jamais accessibles directement depuis un client.
-- Le bot utilise la clé service_role, qui contourne la RLS côté serveur.
alter table public.guild_xp_profiles enable row level security;
alter table public.guild_xp_rewards enable row level security;
alter table public.guild_xp_settings enable row level security;
alter table public.guild_xp_role_boosts enable row level security;

-- Ajout atomique avec cooldown. La formule du niveau est floor(sqrt(xp / 100)).
create or replace function public.add_guild_xp(
    p_guild_id text,
    p_user_id text,
    p_xp integer,
    p_cooldown_seconds integer default 60
)
returns table (
    guild_id text,
    user_id text,
    xp bigint,
    level integer,
    previous_level integer,
    message_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
    current_profile public.guild_xp_profiles%rowtype;
    old_level integer;
begin
    if p_xp <= 0 then
        return;
    end if;

    select *
    into current_profile
    from public.guild_xp_profiles p
    where p.guild_id = p_guild_id and p.user_id = p_user_id
    for update;

    if found and current_profile.last_xp_at is not null
        and current_profile.last_xp_at > now() - make_interval(secs => p_cooldown_seconds) then
        return;
    end if;

    old_level := coalesce(current_profile.level, 0);

    insert into public.guild_xp_profiles as profiles (
        guild_id, user_id, xp, level, message_count, last_xp_at, updated_at
    )
    values (
        p_guild_id,
        p_user_id,
        p_xp,
        floor(sqrt(p_xp::numeric / 100))::integer,
        1,
        now(),
        now()
    )
    on conflict on constraint guild_xp_profiles_pkey do update
    set xp = profiles.xp + excluded.xp,
        level = floor(sqrt((profiles.xp + excluded.xp)::numeric / 100))::integer,
        message_count = profiles.message_count + 1,
        last_xp_at = now(),
        updated_at = now()
    returning profiles.* into current_profile;

    return query select
        current_profile.guild_id,
        current_profile.user_id,
        current_profile.xp,
        current_profile.level,
        old_level,
        current_profile.message_count;
end;
$$;

-- Une fonction SECURITY DEFINER doit être explicitement fermée aux clés
-- publiques. Seul le backend Kepler peut attribuer de l'XP.
revoke execute on function public.add_guild_xp(text, text, integer, integer) from public;
revoke execute on function public.add_guild_xp(text, text, integer, integer) from anon;
revoke execute on function public.add_guild_xp(text, text, integer, integer) from authenticated;
grant execute on function public.add_guild_xp(text, text, integer, integer) to service_role;
