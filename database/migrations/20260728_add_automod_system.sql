-- Auto-modération intelligente, isolée par serveur.
create table if not exists public.guild_automod_settings (
    guild_id text primary key,
    enabled boolean not null default false,
    anti_link_enabled boolean not null default false,
    anti_invite_enabled boolean not null default true,
    anti_spam_enabled boolean not null default true,
    anti_duplicate_enabled boolean not null default true,
    anti_caps_enabled boolean not null default false,
    anti_mention_enabled boolean not null default true,
    allow_own_invites boolean not null default true,
    allowed_domains text[] not null default '{}',
    excluded_channel_ids text[] not null default '{}',
    excluded_role_ids text[] not null default '{}',
    spam_message_count integer not null default 6 check (spam_message_count between 3 and 20),
    spam_interval_seconds integer not null default 8 check (spam_interval_seconds between 2 and 60),
    duplicate_message_count integer not null default 3 check (duplicate_message_count between 2 and 10),
    duplicate_interval_seconds integer not null default 30 check (duplicate_interval_seconds between 5 and 300),
    caps_percentage integer not null default 75 check (caps_percentage between 50 and 100),
    caps_min_letters integer not null default 12 check (caps_min_letters between 5 and 100),
    mention_limit integer not null default 5 check (mention_limit between 2 and 50),
    action text not null default 'timeout' check (action in ('delete', 'warn', 'timeout')),
    strike_threshold integer not null default 3 check (strike_threshold between 1 and 20),
    strike_window_seconds integer not null default 3600 check (strike_window_seconds between 60 and 604800),
    timeout_seconds integer not null default 600 check (timeout_seconds between 10 and 2419200),
    notify_user boolean not null default true,
    updated_at timestamptz not null default now()
);

create table if not exists public.guild_automod_violations (
    id bigint generated always as identity primary key,
    guild_id text not null,
    user_id text not null,
    channel_id text not null,
    message_id text,
    rule text not null check (rule in ('link', 'invite', 'spam', 'duplicate', 'caps', 'mentions')),
    action_taken text not null,
    excerpt text,
    created_at timestamptz not null default now()
);

create index if not exists guild_automod_violations_strikes_idx
    on public.guild_automod_violations (guild_id, user_id, created_at desc);

alter table public.guild_automod_settings enable row level security;
alter table public.guild_automod_violations enable row level security;
