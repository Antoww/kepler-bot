alter table public.server_configs
    add column if not exists ticket_panel_message_id text,
    add column if not exists ticket_panel_published_channel_id text;

comment on column public.server_configs.ticket_panel_message_id is
    'Identifiant du dernier panneau de tickets publié par Kepler.';

comment on column public.server_configs.ticket_panel_published_channel_id is
    'Salon Discord contenant le dernier panneau de tickets publié.';