-- ============================================================================
-- daytu — events.client_extras (jsonb) for client-only fields
--
-- The client persists three fields the server schema doesn't model:
--   monthDays  — recurrence config when frequency = 'specific'
--   overrides  — per-occurrence skip / per-occurrence edit dictionary
--   attendees  — informational labels (deferred until we model attendance)
-- These round-trip as opaque JSON. The server doesn't query against them.
--
-- events_for_viewer() must be dropped + recreated because we're changing the
-- shape of the returns table. Body is otherwise identical to the original
-- in 20260424120000_social_layer.sql.
-- ============================================================================

begin;

alter table public.events
  add column if not exists client_extras jsonb;

drop function if exists public.events_for_viewer();

create function public.events_for_viewer()
returns table (
  id uuid, owner_id uuid, calendar_id uuid,
  title text, start_at timestamptz, end_at timestamptz, all_day boolean,
  location text, url text, notes text, color text,
  pinned boolean, important boolean, frequency text, reminder text,
  visibility text, client_extras jsonb,
  created_at timestamptz, updated_at timestamptz,
  owner_name text, owner_handle text,
  share_path text, share_group_id uuid, share_group_name text
)
language sql stable security definer set search_path = public
as $$
  with me as (select auth.uid() as viewer)
  select
    e.id, e.owner_id, e.calendar_id,
    e.title, e.start_at, e.end_at, e.all_day,
    e.location, e.url, e.notes, e.color,
    e.pinned, e.important, e.frequency, e.reminder,
    e.visibility, e.client_extras,
    e.created_at, e.updated_at,
    p.name              as owner_name,
    p.handle::text      as owner_handle,
    case
      when e.owner_id = me.viewer then 'own'
      when exists (select 1 from public.event_user_shares eus
                   where eus.event_id = e.id and eus.user_id = me.viewer)
        then 'people'
      when exists (select 1 from public.event_group_shares egs
                   join public.group_members gm on gm.group_id = egs.group_id
                   where egs.event_id = e.id and gm.user_id = me.viewer)
        then 'groups'
      when e.visibility = 'friends' then 'friends'
      else null
    end as share_path,
    (select gm.group_id
       from public.event_group_shares egs
       join public.group_members gm on gm.group_id = egs.group_id
      where egs.event_id = e.id and gm.user_id = me.viewer
      order by gm.added_at asc, gm.group_id asc
      limit 1) as share_group_id,
    (select g.name
       from public.event_group_shares egs
       join public.group_members gm on gm.group_id = egs.group_id
       join public.groups g          on g.id = gm.group_id
      where egs.event_id = e.id and gm.user_id = me.viewer
      order by gm.added_at asc, gm.group_id asc
      limit 1) as share_group_name
  from public.events e
  cross join me
  join public.profiles p on p.id = e.owner_id
  where public.can_see_event(me.viewer, e);
$$;

commit;
