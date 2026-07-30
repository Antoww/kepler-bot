-- Corrige l'ambiguïté entre les colonnes retournées par la fonction et les
-- colonnes utilisées comme cible du ON CONFLICT.
create or replace function public.add_guild_xp(
    p_guild_id text,
    p_user_id text,
    p_xp integer,
    p_cooldown_seconds integer default 60
)
returns table (
    guild_id text,
    user_id text,
    xp bigint,
    level integer,
    previous_level integer,
    message_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
    current_profile public.guild_xp_profiles%rowtype;
    old_level integer;
begin
    if p_xp <= 0 then
        return;
    end if;

    select p.*
    into current_profile
    from public.guild_xp_profiles as p
    where p.guild_id = p_guild_id and p.user_id = p_user_id
    for update;

    if found and current_profile.last_xp_at is not null
        and current_profile.last_xp_at > now() - make_interval(secs => p_cooldown_seconds) then
        return;
    end if;

    old_level := coalesce(current_profile.level, 0);

    insert into public.guild_xp_profiles as profiles (
        guild_id, user_id, xp, level, message_count, last_xp_at, updated_at
    )
    values (
        p_guild_id,
        p_user_id,
        p_xp,
        floor(sqrt(p_xp::numeric / 100))::integer,
        1,
        now(),
        now()
    )
    on conflict on constraint guild_xp_profiles_pkey do update
    set xp = profiles.xp + excluded.xp,
        level = floor(sqrt((profiles.xp + excluded.xp)::numeric / 100))::integer,
        message_count = profiles.message_count + 1,
        last_xp_at = now(),
        updated_at = now()
    returning profiles.* into current_profile;

    return query select
        current_profile.guild_id,
        current_profile.user_id,
        current_profile.xp,
        current_profile.level,
        old_level,
        current_profile.message_count;
end;
$$;

revoke execute on function public.add_guild_xp(text, text, integer, integer) from public;
revoke execute on function public.add_guild_xp(text, text, integer, integer) from anon;
revoke execute on function public.add_guild_xp(text, text, integer, integer) from authenticated;
grant execute on function public.add_guild_xp(text, text, integer, integer) to service_role;
