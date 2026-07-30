-- À exécuter sur les bases où le système XP a déjà été créé.
-- Aucune policy client n'est volontairement ajoutée : Kepler est le seul
-- backend autorisé et se connecte avec la clé service_role.

alter table public.guild_xp_profiles enable row level security;
alter table public.guild_xp_rewards enable row level security;
alter table public.guild_xp_settings enable row level security;
alter table public.guild_xp_role_boosts enable row level security;

revoke execute on function public.add_guild_xp(text, text, integer, integer) from public;
revoke execute on function public.add_guild_xp(text, text, integer, integer) from anon;
revoke execute on function public.add_guild_xp(text, text, integer, integer) from authenticated;
grant execute on function public.add_guild_xp(text, text, integer, integer) to service_role;
