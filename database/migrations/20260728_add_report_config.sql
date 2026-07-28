alter table public.server_configs
    add column if not exists report_channel_id text,
    add column if not exists report_role_id text;

comment on column public.server_configs.report_channel_id is
    'Salon Discord recevant les signalements du serveur';

comment on column public.server_configs.report_role_id is
    'Rôle Discord facultatif mentionné lors d’un signalement';
