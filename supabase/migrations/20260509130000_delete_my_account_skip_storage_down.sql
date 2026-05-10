-- ============================================================================
-- Revert: restore delete_my_account() with the storage.objects cleanup block.
-- Mirror of the body from 20260504120000_delete_my_account_rpc.sql.
--
-- WARNING: rolling forward to this state re-introduces the 403 platform
-- rejection on Delete Account. Only useful if the entire pre-fix migration
-- chain is being walked back together.
-- ============================================================================

begin;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth, storage
as $$
declare
  me uuid := auth.uid();
  owned_count int;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select count(*) into owned_count
    from public.group_members
    where user_id = me and role = 'owner';
  if owned_count > 0 then
    raise exception 'account has % owned group(s); transfer or delete them first', owned_count;
  end if;

  delete from storage.objects
    where bucket_id = 'avatars'
      and (storage.foldername(name))[1] = me::text;

  delete from auth.users where id = me;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

commit;
