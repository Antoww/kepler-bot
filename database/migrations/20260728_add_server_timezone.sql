alter table public.server_configs
    add column if not exists timezone text not null default 'Europe/Paris';

comment on column public.server_configs.timezone is
    'Fuseau horaire IANA utilisé pour interpréter les dates locales du serveur.';
