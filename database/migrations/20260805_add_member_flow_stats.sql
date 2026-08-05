-- Agrégation quotidienne des arrivées et départs pour les graphiques serveur.
create or replace function public.get_guild_member_flow(
    p_guild_id text,
    p_since timestamptz default null
)
returns table (stat_date date, joins bigint, leaves bigint)
language sql
security definer
set search_path = public
as $$
    with events as (
        select joined_at::date as event_date, 1::bigint as joins, 0::bigint as leaves
        from public.guild_invite_joins
        where guild_id = p_guild_id
          and (p_since is null or joined_at >= p_since)
        union all
        select left_at::date as event_date, 0::bigint as joins, 1::bigint as leaves
        from public.guild_invite_joins
        where guild_id = p_guild_id
          and left_at is not null
          and (p_since is null or left_at >= p_since)
    )
    select event_date, sum(events.joins)::bigint, sum(events.leaves)::bigint
    from events
    group by event_date
    order by event_date;
$$;

revoke execute on function public.get_guild_member_flow(text, timestamptz) from public, anon, authenticated;
grant execute on function public.get_guild_member_flow(text, timestamptz) to service_role;
