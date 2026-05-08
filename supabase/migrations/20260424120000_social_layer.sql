-- ============================================================================
-- daytu social layer
--
-- Adds identity, friendships, groups (w/ owner/editor/member roles and an
-- owner-toggled member-list privacy flag), events/major_events/shifts with
-- 4-level visibility (private/friends/groups/people) and separate share-target
-- tables that are NOT deleted when a friendship ends — RLS + helper predicates
-- revoke visibility at query time instead.
--
-- Also adds viewer functions (events_for_viewer, major_events_for_viewer,
-- shifts_for_viewer) that return the row PLUS the share-path metadata
-- (share_path / share_group_id / share_group_name) the client needs to render
-- the "shared by" pill. Most-specific path wins: own > people > groups > friends.
-- ============================================================================

begin;

-- Extensions -----------------------------------------------------------------
create extension if not exists citext;
create extension if not exists pgcrypto;

-- ============================================================================
-- profiles — 1:1 with auth.users; autocreated by trigger below.
-- ============================================================================
create table public.profiles (
  id           uuid        primary key references auth.users(id) on delete cascade,
  handle       citext      unique not null,
  name         text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint handle_format check ((handle::text) ~ '^[a-z0-9_]{3,20}$')
);

-- ============================================================================
-- friendships — unordered pair via user_lo < user_hi; one row per pair.
-- Unfriend = DELETE. Shares are left intact; RLS re-evaluates at query time.
-- ============================================================================
create table public.friendships (
  id            uuid        primary key default gen_random_uuid(),
  user_lo       uuid        not null references public.profiles(id) on delete cascade,
  user_hi       uuid        not null references public.profiles(id) on delete cascade,
  requested_by  uuid        not null references public.profiles(id) on delete cascade,
  status        text        not null check (status in ('pending','accepted')),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  constraint friendships_pair_ordered       check (user_lo < user_hi),
  constraint friendships_requester_in_pair  check (requested_by in (user_lo, user_hi)),
  unique (user_lo, user_hi)
);

create index friendships_user_lo_accepted_idx on public.friendships (user_lo) where status = 'accepted';
create index friendships_user_hi_accepted_idx on public.friendships (user_hi) where status = 'accepted';

-- ============================================================================
-- groups + group_members
-- Owner is canonical via group_members.role='owner' (partial unique index
-- enforces exactly one owner per group; a deferred invariant trigger enforces
-- "at least one owner" at commit time).
-- ============================================================================
create table public.groups (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  color               text,
  member_list_hidden  boolean     not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.group_members (
  group_id  uuid        not null references public.groups(id) on delete cascade,
  user_id   uuid        not null references public.profiles(id) on delete cascade,
  role      text        not null check (role in ('owner','editor','member')),
  added_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create unique index group_members_one_owner_idx
  on public.group_members(group_id) where role = 'owner';

create index group_members_user_idx on public.group_members (user_id);

-- ============================================================================
-- events + share targets
-- ============================================================================
create table public.events (
  id           uuid        primary key default gen_random_uuid(),
  owner_id     uuid        not null references public.profiles(id) on delete cascade,
  calendar_id  uuid,
  title        text,
  start_at     timestamptz,
  end_at       timestamptz,
  all_day      boolean     not null default false,
  location     text,
  url          text,
  notes        text,
  color        text,
  pinned       boolean     not null default false,
  important    boolean     not null default false,
  frequency    text,
  reminder     text,
  visibility   text        not null default 'private'
                           check (visibility in ('private','friends','groups','people')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index events_owner_idx on public.events (owner_id);
create index events_start_idx on public.events (start_at);

create table public.event_group_shares (
  event_id  uuid not null references public.events(id) on delete cascade,
  group_id  uuid not null references public.groups(id) on delete cascade,
  primary key (event_id, group_id)
);
create index event_group_shares_group_idx on public.event_group_shares (group_id);

create table public.event_user_shares (
  event_id  uuid not null references public.events(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  primary key (event_id, user_id)
);
create index event_user_shares_user_idx on public.event_user_shares (user_id);

-- ============================================================================
-- major_events (multi-day countdowns) + share targets
-- ============================================================================
create table public.major_events (
  id              uuid        primary key default gen_random_uuid(),
  owner_id        uuid        not null references public.profiles(id) on delete cascade,
  title           text,
  color           text,
  show_countdown  boolean     not null default true,
  start_date      date,
  end_date        date,
  all_day         boolean     not null default true,
  notes           text,
  location        text,
  url             text,
  visibility      text        not null default 'private'
                              check (visibility in ('private','friends','groups','people')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index major_events_owner_idx on public.major_events (owner_id);
create index major_events_start_idx on public.major_events (start_date);

create table public.major_event_group_shares (
  major_event_id  uuid not null references public.major_events(id) on delete cascade,
  group_id        uuid not null references public.groups(id) on delete cascade,
  primary key (major_event_id, group_id)
);
create index major_event_group_shares_group_idx on public.major_event_group_shares (group_id);

create table public.major_event_user_shares (
  major_event_id  uuid not null references public.major_events(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  primary key (major_event_id, user_id)
);
create index major_event_user_shares_user_idx on public.major_event_user_shares (user_id);

-- ============================================================================
-- shifts (patterns) + share targets
-- ============================================================================
create table public.shifts (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references public.profiles(id) on delete cascade,
  name        text,
  type        text        check (type in ('rotation','weekly','monthly')),
  color       text,
  priority    int,
  config      jsonb       not null,
  visibility  text        not null default 'private'
                          check (visibility in ('private','friends','groups','people')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index shifts_owner_idx on public.shifts (owner_id);

create table public.shift_group_shares (
  shift_id  uuid not null references public.shifts(id) on delete cascade,
  group_id  uuid not null references public.groups(id) on delete cascade,
  primary key (shift_id, group_id)
);
create index shift_group_shares_group_idx on public.shift_group_shares (group_id);

create table public.shift_user_shares (
  shift_id  uuid not null references public.shifts(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  primary key (shift_id, user_id)
);
create index shift_user_shares_user_idx on public.shift_user_shares (user_id);

-- ============================================================================
-- HELPERS — all SECURITY DEFINER + STABLE so they can safely be used from RLS.
-- ============================================================================

create or replace function public.is_friend(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select a is distinct from b and exists (
    select 1 from public.friendships
    where status = 'accepted'
      and user_lo = least(a, b)
      and user_hi = greatest(a, b)
  );
$$;

create or replace function public.group_role(u uuid, g uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.group_members
  where user_id = u and group_id = g;
$$;

create or replace function public.is_group_member(u uuid, g uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where user_id = u and group_id = g
  );
$$;

-- Visibility predicates — one per resource. Non-public branches always require
-- is_friend(viewer, owner), so unfriending immediately revokes access.

create or replace function public.can_see_event(viewer uuid, ev public.events)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    viewer = ev.owner_id
    or (
      public.is_friend(viewer, ev.owner_id)
      and (
        ev.visibility = 'friends'
        or (ev.visibility = 'groups' and exists (
              select 1 from public.event_group_shares egs
              join public.group_members gm on gm.group_id = egs.group_id
              where egs.event_id = ev.id and gm.user_id = viewer))
        or (ev.visibility = 'people' and exists (
              select 1 from public.event_user_shares eus
              where eus.event_id = ev.id and eus.user_id = viewer))
      )
    );
$$;

create or replace function public.can_see_major_event(viewer uuid, m public.major_events)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    viewer = m.owner_id
    or (
      public.is_friend(viewer, m.owner_id)
      and (
        m.visibility = 'friends'
        or (m.visibility = 'groups' and exists (
              select 1 from public.major_event_group_shares mgs
              join public.group_members gm on gm.group_id = mgs.group_id
              where mgs.major_event_id = m.id and gm.user_id = viewer))
        or (m.visibility = 'people' and exists (
              select 1 from public.major_event_user_shares mus
              where mus.major_event_id = m.id and mus.user_id = viewer))
      )
    );
$$;

create or replace function public.can_see_shift(viewer uuid, s public.shifts)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    viewer = s.owner_id
    or (
      public.is_friend(viewer, s.owner_id)
      and (
        s.visibility = 'friends'
        or (s.visibility = 'groups' and exists (
              select 1 from public.shift_group_shares sgs
              join public.group_members gm on gm.group_id = sgs.group_id
              where sgs.shift_id = s.id and gm.user_id = viewer))
        or (s.visibility = 'people' and exists (
              select 1 from public.shift_user_shares sus
              where sus.shift_id = s.id and sus.user_id = viewer))
      )
    );
$$;

-- ============================================================================
-- VIEWER FUNCTIONS — return rows the caller can see, plus share-path metadata.
-- share_path priority (most specific first): own > people > groups > friends.
-- share_group_id / share_group_name are populated only for 'groups' path.
-- ============================================================================

create or replace function public.events_for_viewer()
returns table (
  id uuid, owner_id uuid, calendar_id uuid,
  title text, start_at timestamptz, end_at timestamptz, all_day boolean,
  location text, url text, notes text, color text,
  pinned boolean, important boolean, frequency text, reminder text,
  visibility text, created_at timestamptz, updated_at timestamptz,
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
    e.visibility, e.created_at, e.updated_at,
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

create or replace function public.major_events_for_viewer()
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

create or replace function public.shifts_for_viewer()
returns table (
  id uuid, owner_id uuid, name text, type text, color text,
  priority int, config jsonb, visibility text,
  created_at timestamptz, updated_at timestamptz,
  owner_name text, owner_handle text,
  share_path text, share_group_id uuid, share_group_name text
)
language sql stable security definer set search_path = public
as $$
  with me as (select auth.uid() as viewer)
  select
    s.id, s.owner_id, s.name, s.type, s.color,
    s.priority, s.config, s.visibility,
    s.created_at, s.updated_at,
    p.name              as owner_name,
    p.handle::text      as owner_handle,
    case
      when s.owner_id = me.viewer then 'own'
      when exists (select 1 from public.shift_user_shares sus
                   where sus.shift_id = s.id and sus.user_id = me.viewer)
        then 'people'
      when exists (select 1 from public.shift_group_shares sgs
                   join public.group_members gm on gm.group_id = sgs.group_id
                   where sgs.shift_id = s.id and gm.user_id = me.viewer)
        then 'groups'
      when s.visibility = 'friends' then 'friends'
      else null
    end as share_path,
    (select gm.group_id
       from public.shift_group_shares sgs
       join public.group_members gm on gm.group_id = sgs.group_id
      where sgs.shift_id = s.id and gm.user_id = me.viewer
      order by gm.added_at asc, gm.group_id asc
      limit 1) as share_group_id,
    (select g.name
       from public.shift_group_shares sgs
       join public.group_members gm on gm.group_id = sgs.group_id
       join public.groups g          on g.id = gm.group_id
      where sgs.shift_id = s.id and gm.user_id = me.viewer
      order by gm.added_at asc, gm.group_id asc
      limit 1) as share_group_name
  from public.shifts s
  cross join me
  join public.profiles p on p.id = s.owner_id
  where public.can_see_shift(me.viewer, s);
$$;

-- ============================================================================
-- RPCs (atomic / privileged operations)
-- ============================================================================

create or replace function public.send_friend_request(other uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid(); lo uuid; hi uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other = me then raise exception 'cannot friend yourself'; end if;
  lo := least(me, other); hi := greatest(me, other);
  insert into public.friendships (user_lo, user_hi, requested_by, status)
    values (lo, hi, me, 'pending')
  on conflict (user_lo, user_hi) do nothing;
end;
$$;

create or replace function public.accept_friend_request(other uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid(); lo uuid; hi uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  lo := least(me, other); hi := greatest(me, other);
  update public.friendships
     set status = 'accepted', accepted_at = now()
   where user_lo = lo and user_hi = hi
     and status = 'pending'
     and requested_by <> me;
  if not found then raise exception 'no pending request to accept'; end if;
end;
$$;

create or replace function public.unfriend(other uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid(); lo uuid; hi uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  lo := least(me, other); hi := greatest(me, other);
  delete from public.friendships where user_lo = lo and user_hi = hi;
end;
$$;

create or replace function public.create_group(p_name text, p_color text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid(); new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  insert into public.groups (name, color) values (p_name, p_color)
    returning id into new_id;
  insert into public.group_members (group_id, user_id, role)
    values (new_id, me, 'owner');
  return new_id;
end;
$$;

create or replace function public.transfer_group_ownership(p_group uuid, p_new_owner uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if public.group_role(me, p_group) <> 'owner' then
    raise exception 'only the owner can transfer ownership';
  end if;
  if public.group_role(p_new_owner, p_group) is null then
    raise exception 'new owner must already be a group member';
  end if;
  update public.group_members set role = 'editor'
    where group_id = p_group and user_id = me;
  update public.group_members set role = 'owner'
    where group_id = p_group and user_id = p_new_owner;
end;
$$;

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.tg_set_updated_at();
create trigger groups_updated_at        before update on public.groups        for each row execute function public.tg_set_updated_at();
create trigger events_updated_at        before update on public.events        for each row execute function public.tg_set_updated_at();
create trigger major_events_updated_at  before update on public.major_events  for each row execute function public.tg_set_updated_at();
create trigger shifts_updated_at        before update on public.shifts        for each row execute function public.tg_set_updated_at();

-- Deferred invariant: every group must have exactly one owner at commit time.
-- Deferred so transfer_group_ownership can swap owner→editor and member→owner
-- in the same transaction without tripping mid-flight.
create or replace function public.tg_group_owner_invariant()
returns trigger language plpgsql as $$
declare gid uuid;
begin
  gid := coalesce(new.group_id, old.group_id);
  if not exists (select 1 from public.groups where id = gid) then
    return null; -- group itself was deleted; nothing to enforce
  end if;
  if not exists (
    select 1 from public.group_members where group_id = gid and role = 'owner'
  ) then
    raise exception 'group % must have exactly one owner', gid;
  end if;
  return null;
end;
$$;

create constraint trigger group_members_owner_invariant
  after insert or update or delete on public.group_members
  deferrable initially deferred
  for each row execute function public.tg_group_owner_invariant();

-- friendships.requested_by is immutable once a row exists — belt-and-suspenders
-- against RLS-level writes that bypass accept_friend_request().
create or replace function public.tg_friendships_requested_by_immutable()
returns trigger language plpgsql as $$
begin
  if new.requested_by is distinct from old.requested_by then
    raise exception 'friendships.requested_by is immutable';
  end if;
  if new.user_lo is distinct from old.user_lo
     or new.user_hi is distinct from old.user_hi then
    raise exception 'friendships pair (user_lo, user_hi) is immutable';
  end if;
  return new;
end;
$$;

create trigger friendships_immutable_pair
  before update on public.friendships
  for each row execute function public.tg_friendships_requested_by_immutable();

-- Autocreate a profile row on auth.users insert. Derives a handle from
-- raw_user_meta_data.handle or the email local-part, sanitizes it, and
-- appends a random suffix if taken.
create or replace function public.tg_profile_on_signup()
returns trigger language plpgsql security definer set search_path = public
as $$
declare suggested citext;
begin
  suggested := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1), ''),
    '[^a-z0-9_]', '', 'g'
  ));
  if length(suggested) < 3 then
    suggested := 'user' || substring(new.id::text, 1, 6);
  end if;
  if length(suggested) > 20 then
    suggested := substring(suggested, 1, 20);
  end if;
  while exists (select 1 from public.profiles where handle = suggested) loop
    suggested := substring(suggested, 1, 18) || substring(md5(random()::text), 1, 2);
  end loop;
  insert into public.profiles (id, handle, name)
    values (new.id, suggested, new.raw_user_meta_data->>'name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_profile_on_signup();

-- ============================================================================
-- Row-Level Security
-- ============================================================================

alter table public.profiles                  enable row level security;
alter table public.friendships               enable row level security;
alter table public.groups                    enable row level security;
alter table public.group_members             enable row level security;
alter table public.events                    enable row level security;
alter table public.event_group_shares        enable row level security;
alter table public.event_user_shares         enable row level security;
alter table public.major_events              enable row level security;
alter table public.major_event_group_shares  enable row level security;
alter table public.major_event_user_shares   enable row level security;
alter table public.shifts                    enable row level security;
alter table public.shift_group_shares        enable row level security;
alter table public.shift_user_shares         enable row level security;

-- profiles --------------------------------------------------------------------
-- All authed users can read (needed for @handle search); users edit only own row.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- friendships -----------------------------------------------------------------
create policy friendships_select on public.friendships
  for select to authenticated
  using (auth.uid() in (user_lo, user_hi));

create policy friendships_insert on public.friendships
  for insert to authenticated
  with check (
    requested_by = auth.uid()
    and auth.uid() in (user_lo, user_hi)
    and status = 'pending'
  );

-- Only the non-requester can flip pending → accepted.
create policy friendships_update on public.friendships
  for update to authenticated
  using  (auth.uid() in (user_lo, user_hi) and auth.uid() <> requested_by)
  with check (status = 'accepted');

-- Either party can delete (unfriend / cancel / decline).
create policy friendships_delete on public.friendships
  for delete to authenticated
  using (auth.uid() in (user_lo, user_hi));

-- groups ----------------------------------------------------------------------
create policy groups_select on public.groups
  for select to authenticated using (public.is_group_member(auth.uid(), id));

-- Insert is permitted; create_group() RPC is the recommended path (it atomically
-- inserts the owner row, which the deferred invariant requires).
create policy groups_insert on public.groups
  for insert to authenticated with check (true);

create policy groups_update on public.groups
  for update to authenticated
  using  (public.group_role(auth.uid(), id) = 'owner')
  with check (public.group_role(auth.uid(), id) = 'owner');

create policy groups_delete on public.groups
  for delete to authenticated
  using (public.group_role(auth.uid(), id) = 'owner');

-- group_members: member-list asymmetry + role-gated writes ---------------------
-- SELECT: visible if you're in the group AND one of:
--   (a) member_list_hidden = false  — default, everyone sees the list
--   (b) you are owner/editor
--   (c) the row is your own
create policy group_members_select on public.group_members
  for select to authenticated using (
    exists (
      select 1 from public.group_members self
      where self.group_id = group_members.group_id
        and self.user_id  = auth.uid()
    )
    and (
      not (select g.member_list_hidden from public.groups g where g.id = group_members.group_id)
      or public.group_role(auth.uid(), group_members.group_id) in ('owner','editor')
      or group_members.user_id = auth.uid()
    )
  );

-- INSERT: owner can add anyone (any role). Editor can add role='member' only.
create policy group_members_insert on public.group_members
  for insert to authenticated with check (
    public.group_role(auth.uid(), group_id) = 'owner'
    or (public.group_role(auth.uid(), group_id) = 'editor' and role = 'member')
  );

-- UPDATE (role changes, etc.): owner only.
create policy group_members_update on public.group_members
  for update to authenticated
  using  (public.group_role(auth.uid(), group_id) = 'owner')
  with check (public.group_role(auth.uid(), group_id) = 'owner');

-- DELETE: owner can remove anyone. Editor can remove role='member' rows only
-- (cannot touch the owner row or other editors).
create policy group_members_delete on public.group_members
  for delete to authenticated using (
    public.group_role(auth.uid(), group_id) = 'owner'
    or (public.group_role(auth.uid(), group_id) = 'editor' and role = 'member')
  );

-- events ----------------------------------------------------------------------
create policy events_select on public.events
  for select to authenticated using (public.can_see_event(auth.uid(), events));
create policy events_insert on public.events
  for insert to authenticated with check (owner_id = auth.uid());
create policy events_update on public.events
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy events_delete on public.events
  for delete to authenticated using (owner_id = auth.uid());

-- event share targets: only the event owner manipulates these; reads flow
-- through the events policy / events_for_viewer().
create policy event_group_shares_owner on public.event_group_shares
  for all to authenticated
  using      (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

create policy event_user_shares_owner on public.event_user_shares
  for all to authenticated
  using      (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()))
  with check (exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid()));

-- major_events ----------------------------------------------------------------
create policy major_events_select on public.major_events
  for select to authenticated using (public.can_see_major_event(auth.uid(), major_events));
create policy major_events_insert on public.major_events
  for insert to authenticated with check (owner_id = auth.uid());
create policy major_events_update on public.major_events
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy major_events_delete on public.major_events
  for delete to authenticated using (owner_id = auth.uid());

create policy major_event_group_shares_owner on public.major_event_group_shares
  for all to authenticated
  using      (exists (select 1 from public.major_events m where m.id = major_event_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.major_events m where m.id = major_event_id and m.owner_id = auth.uid()));

create policy major_event_user_shares_owner on public.major_event_user_shares
  for all to authenticated
  using      (exists (select 1 from public.major_events m where m.id = major_event_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.major_events m where m.id = major_event_id and m.owner_id = auth.uid()));

-- shifts ----------------------------------------------------------------------
create policy shifts_select on public.shifts
  for select to authenticated using (public.can_see_shift(auth.uid(), shifts));
create policy shifts_insert on public.shifts
  for insert to authenticated with check (owner_id = auth.uid());
create policy shifts_update on public.shifts
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy shifts_delete on public.shifts
  for delete to authenticated using (owner_id = auth.uid());

create policy shift_group_shares_owner on public.shift_group_shares
  for all to authenticated
  using      (exists (select 1 from public.shifts s where s.id = shift_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shifts s where s.id = shift_id and s.owner_id = auth.uid()));

create policy shift_user_shares_owner on public.shift_user_shares
  for all to authenticated
  using      (exists (select 1 from public.shifts s where s.id = shift_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shifts s where s.id = shift_id and s.owner_id = auth.uid()));

-- ============================================================================
-- Storage: avatars bucket
-- Layout: avatars/{auth.uid}/<filename>. Public read; only the owning user
-- may write/update/delete under their own prefix.
-- ============================================================================
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars public read" on storage.objects
  for select to public using (bucket_id = 'avatars');

create policy "avatars owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- Grants
-- ============================================================================
grant execute on function
  public.is_friend(uuid, uuid),
  public.group_role(uuid, uuid),
  public.is_group_member(uuid, uuid),
  public.can_see_event(uuid, public.events),
  public.can_see_major_event(uuid, public.major_events),
  public.can_see_shift(uuid, public.shifts),
  public.events_for_viewer(),
  public.major_events_for_viewer(),
  public.shifts_for_viewer(),
  public.send_friend_request(uuid),
  public.accept_friend_request(uuid),
  public.unfriend(uuid),
  public.create_group(text, text),
  public.transfer_group_ownership(uuid, uuid)
to authenticated;

commit;
