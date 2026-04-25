-- ============================================================================
-- daytu — handle_is_placeholder + handle availability/claim RPCs
--
-- Adds a flag so the client can tell, on first sign-in, whether to prompt the
-- user to pick a real handle vs. silently accept the auto-generated one.
-- Plus two RPCs: handle_available() for real-time validation, and
-- claim_handle() for atomic write (catches unique conflicts gracefully).
-- ============================================================================

begin;

-- 1. Column. default=true → every existing row (all of which came from the
--    signup trigger or backfill, i.e. auto-generated) becomes a placeholder.
alter table public.profiles
  add column if not exists handle_is_placeholder boolean not null default true;

-- 2. Replace the signup trigger body so the flag is set explicitly (defensive;
--    the column default already produces true on insert).
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
  insert into public.profiles (id, handle, name, handle_is_placeholder)
    values (new.id, suggested, new.raw_user_meta_data->>'name', true);
  return new;
end;
$$;

-- 3. Real-time availability check. Returns true iff format is valid AND no
--    OTHER profile holds this handle. The caller's own current handle counts
--    as "available" so they can accept the auto-generated placeholder as-is.
create or replace function public.handle_available(p_handle text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    p_handle ~ '^[a-z0-9_]{3,20}$'
    and not exists (
      select 1 from public.profiles
      where handle = p_handle::citext
        and id is distinct from auth.uid()
    );
$$;

-- 4. Atomic claim. Validates format, updates the caller's row, flips the
--    placeholder flag, and translates unique-violation into a friendly error.
create or replace function public.claim_handle(p_handle text)
returns void
language plpgsql security definer set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_handle !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid handle format';
  end if;
  begin
    update public.profiles
      set handle = p_handle, handle_is_placeholder = false
      where id = me;
  exception when unique_violation then
    raise exception 'handle already taken';
  end;
end;
$$;

grant execute on function
  public.handle_available(text),
  public.claim_handle(text)
to authenticated;

commit;
