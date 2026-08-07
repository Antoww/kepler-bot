-- Les nouvelles configurations XP utilisent un cooldown plus dynamique.
-- Les lignes existantes conservent volontairement leur valeur actuelle.
alter table public.guild_xp_settings
    alter column cooldown_seconds set default 5;
