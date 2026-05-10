-- ============================================================================
-- delete_my_account() — strip storage.objects cleanup
--
-- The original (20260504120000_delete_my_account_rpc) attempted to delete
-- the caller's avatars from storage.objects directly via SQL inside the
-- SECURITY DEFINER function. Supabase Cloud blocks this at the API layer
-- with "Direct deletion from storage tables is not allowed. Use the Storage
-- API instead." — even with a privileged function owner. Surface was a 403
-- on every Delete Account attempt; the pre-flight and auth.users delete
-- were never reached.
--
-- Hotfix: drop the storage cleanup. Avatars become orphan files on account
-- deletion. Trade-off accepted for launch:
--   - Avatars are small (KB-sized PNGs), not PII once auth.users is gone
--   - Alternative requires Edge Function infrastructure (Approach A in the
--     post-launch backlog)
--
-- The pre-flight owned-groups check and the auth.users delete are unchanged.
-- The cascade chain (auth.users → profiles → events / shifts / friendships /
-- group_members / share-target tables) cleans up everything else as before.
--
-- Post-launch plan: Edge Function using supabase.auth.admin.deleteUser plus
-- storage.from('avatars').remove() — the Storage-API-based path. Until then,
-- orphan avatars can be swept periodically via a job that joins
-- storage.objects against a missing-from-auth.users predicate.
-- ============================================================================

begin;

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth
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

  -- TODO(post-launch): re-add avatar cleanup via Edge Function + Storage API.
  -- Direct DELETE on storage.objects from SQL is rejected by Supabase Cloud.
  -- Avatars at avatars/{me}/* are orphaned by this delete cascade.

  delete from auth.users where id = me;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

commit;
