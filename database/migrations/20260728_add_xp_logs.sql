-- Journal dédié au système XP et suivi durable des fins de boost.
alter table public.guild_xp_settings
    add column if not exists xp_log_channel_id text,
    add column if not exists boost_end_notified_at timestamptz;
