-- AutoMod V1.1: observation, filtres personnalisés et sanctions par règle.
alter table public.guild_automod_settings
    add column if not exists observation_mode boolean not null default false,
    add column if not exists anti_keyword_enabled boolean not null default false,
    add column if not exists blocked_keywords text[] not null default '{}',
    add column if not exists allowed_keywords text[] not null default '{}',
    add column if not exists regex_patterns text[] not null default '{}',
    add column if not exists rule_actions jsonb not null default '{}'::jsonb,
    add column if not exists escalation_steps jsonb not null default '[]'::jsonb;

alter table public.guild_automod_settings
    add column if not exists anti_raid_enabled boolean not null default false,
    add column if not exists raid_join_count integer not null default 8 check (raid_join_count between 3 and 50),
    add column if not exists raid_interval_seconds integer not null default 20 check (raid_interval_seconds between 5 and 300),
    add column if not exists raid_account_age_hours integer not null default 24 check (raid_account_age_hours between 1 and 720),
    add column if not exists raid_mode_seconds integer not null default 600 check (raid_mode_seconds between 60 and 3600);

alter table public.guild_automod_violations
    add column if not exists source text not null default 'message_create',
    add column if not exists observed boolean not null default false;

alter table public.guild_automod_violations
    drop constraint if exists guild_automod_violations_rule_check;

alter table public.guild_automod_violations
    add constraint guild_automod_violations_rule_check
    check (rule in ('link', 'invite', 'spam', 'duplicate', 'caps', 'mentions', 'keyword'));

create index if not exists guild_automod_violations_stats_idx
    on public.guild_automod_violations (guild_id, rule, created_at desc);
