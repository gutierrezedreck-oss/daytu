-- ============================================================================
-- Reverses 20260506120000_major_events_pinned.sql.
-- Restores the prior major_events_for_viewer() signature (no pinned), then
-- drops the column. Any user pin state in the column is destroyed.
-- ============================================================================

begin;

drop function if exists public.major_events_for_viewer();

create function public.major_events_for_viewer()
returns table (
  id uuid, owner_id uuid, title text, color text,
  show_countdown boolean, start_date date, end_date date, all_day boolean,
  notes text, location text, url text, visibility text,
  created_at timestamptz, updated_at timestamptz,
  owner_name text, owner_handle text,
  share_path text, share_group_id uuid, share_group_name text
)
language sql stable security definer set search_path = public
as $$
  with me as (select auth.uid() as viewer)
  select
    m.id, m.owner_id, m.title, m.color,
    m.show_countdown, m.start_date, m.end_date, m.all_day,
    m.notes, m.location, m.url, m.visibility,
    m.created_at, m.updated_at,
    p.name              as owner_name,
    p.handle::text      as owner_handle,
    case
      when m.owner_id = me.viewer then 'own'
      when exists (select 1 from public.major_event_user_shares mus
                   where mus.major_event_id = m.id and mus.user_id = me.viewer)
        then 'people'
      when exists (select 1 from public.major_event_group_shares mgs
                   join public.group_members gm on gm.group_id = mgs.group_id
                   where mgs.major_event_id = m.id and gm.user_id = me.viewer)
        then 'groups'
      when m.visibility = 'friends' then 'friends'
      else null
    end as share_path,
    (select gm.group_id
       from public.major_event_group_shares mgs
       join public.group_members gm on gm.group_id = mgs.group_id
      where mgs.major_event_id = m.id and gm.user_id = me.viewer
      order by gm.added_at asc, gm.group_id asc
      limit 1) as share_group_id,
    (select g.name
       from public.major_event_group_shares mgs
       join public.group_members gm on gm.group_id = mgs.group_id
       join public.groups g          on g.id = gm.group_id
      where mgs.major_event_id = m.id and gm.user_id = me.viewer
      order by gm.added_at asc, gm.group_id asc
      limit 1) as share_group_name
  from public.major_events m
  cross join me
  join public.profiles p on p.id = m.owner_id
  where public.can_see_major_event(me.viewer, m);
$$;

alter table public.major_events
  drop column if exists pinned;

commit;
