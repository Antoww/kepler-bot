alter table public.server_configs
    add column if not exists ticket_panel_channel_id text,
    add column if not exists ticket_category_id text,
    add column if not exists ticket_log_channel_id text,
    add column if not exists ticket_support_role_id text,
    add column if not exists ticket_panel_title text not null default 'Besoin d’aide ?',
    add column if not exists ticket_panel_message text not null default 'Cliquez sur le bouton ci-dessous pour ouvrir un ticket privé avec l’équipe du serveur.',
    add column if not exists ticket_button_label text not null default 'Ouvrir un ticket',
    add column if not exists ticket_button_emoji text default '🎫',
    add column if not exists ticket_button_style text not null default 'Primary'
        check (ticket_button_style in ('Primary', 'Secondary', 'Success', 'Danger'));

comment on column public.server_configs.ticket_panel_channel_id is
    'Salon Discord dans lequel le panneau public des tickets est envoyé.';
comment on column public.server_configs.ticket_category_id is
    'Catégorie Discord dans laquelle les salons de tickets sont créés.';
comment on column public.server_configs.ticket_log_channel_id is
    'Salon Discord recevant les changements d’état et les archives des tickets.';
comment on column public.server_configs.ticket_support_role_id is
    'Rôle Discord autorisé à consulter et contrôler les tickets.';
