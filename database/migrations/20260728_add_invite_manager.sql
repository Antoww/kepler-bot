-- Gestion des invitations, isolée par serveur.
create table if not exists public.guild_invite_settings (
    guild_id text primary key,
    enabled boolean not null default true,
    log_channel_id text,
    welcome_channel_id text,
    welcome_enabled boolean not null default false,
    welcome_message text not null default 'Bienvenue {membre} sur **{serveur}** !',
    log_invite_create boolean not null default true,
    log_invite_delete boolean not null default true,
    log_invite_use boolean not null default true,
    show_invite_code boolean not null default true,
    show_inviter boolean not null default true,
    show_invite_uses boolean not null default true,
    show_invite_channel boolean not null default false,
    show_member_count boolean not null default true,
    show_account_age boolean not null default false,
    updated_at timestamptz not null default now()
);

create table if not exists public.guild_invites (
    guild_id text not null,
    code text not null,
    inviter_id text,
    channel_id text,
    uses integer not null default 0 check (uses >= 0),
    max_uses integer not null default 0 check (max_uses >= 0),
    max_age integer not null default 0 check (max_age >= 0),
    temporary boolean not null default false,
    created_at timestamptz,
    expires_at timestamptz,
    deleted_at timestamptz,
    last_synced_at timestamptz not null default now(),
    primary key (guild_id, code)
);

create table if not exists public.guild_invite_joins (
    id bigint generated always as identity primary key,
    guild_id text not null,
    user_id text not null,
    invite_code text,
    inviter_id text,
    joined_at timestamptz not null default now(),
    left_at timestamptz
);

create index if not exists guild_invites_guild_uses_idx
    on public.guild_invites (guild_id, uses desc);
create index if not exists guild_invite_joins_guild_inviter_idx
    on public.guild_invite_joins (guild_id, inviter_id, joined_at desc);
create index if not exists guild_invite_joins_member_idx
    on public.guild_invite_joins (guild_id, user_id, joined_at desc);

-- Le bot utilise exclusivement la clé service_role.
alter table public.guild_invite_settings enable row level security;
alter table public.guild_invites enable row level security;
alter table public.guild_invite_joins enable row level security;

create or replace function public.get_guild_invite_leaderboard(
    p_guild_id text,
    p_limit integer default 10
)
returns table (inviter_id text, invite_count bigint)
language sql
security definer
set search_path = public
as $$
    select joins.inviter_id, count(*)::bigint
    from public.guild_invite_joins joins
    where joins.guild_id = p_guild_id
      and joins.inviter_id is not null
    group by joins.inviter_id
    order by count(*) desc
    limit greatest(1, least(p_limit, 25));
$$;

create or replace function public.get_guild_invite_member_stats(
    p_guild_id text,
    p_user_id text
)
returns table (total_invites bigint, active_members bigint)
language sql
security definer
set search_path = public
as $$
    select
        count(*)::bigint,
        count(*) filter (where joins.left_at is null)::bigint
    from public.guild_invite_joins joins
    where joins.guild_id = p_guild_id
      and joins.inviter_id = p_user_id;
$$;

revoke execute on function public.get_guild_invite_leaderboard(text, integer) from public, anon, authenticated;
revoke execute on function public.get_guild_invite_member_stats(text, text) from public, anon, authenticated;
grant execute on function public.get_guild_invite_leaderboard(text, integer) to service_role;
grant execute on function public.get_guild_invite_member_stats(text, text) to service_role;
