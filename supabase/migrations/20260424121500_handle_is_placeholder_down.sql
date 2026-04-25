-- ============================================================================
-- Reverses 20260424121500_handle_is_placeholder.sql.
-- Drops the two RPCs, restores the original signup trigger body, drops the
-- column. Safe to run any time after the up-migration.
-- ============================================================================

begin;

drop function if exists public.claim_handle(text);
drop function if exists public.handle_available(text);

-- Restore the pre-change signup trigger body (no handle_is_placeholder column).
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

alter table public.profiles drop column if exists handle_is_placeholder;

commit;
