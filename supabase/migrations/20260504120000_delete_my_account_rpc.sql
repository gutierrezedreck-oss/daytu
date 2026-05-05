-- ============================================================================
-- delete_my_account()
--
-- Caller-initiated permanent self-deletion of the user's account. Atomic
-- single-transaction destructive cascade:
--
--   1. Pre-flight refuse if caller owns any groups. Same UX rationale as
--      leave_group's sole-owner refusal — deleting an owned group via
--      cascade would leave its members surprised. Caller (client) is
--      expected to also surface the list pre-flight; this raise is a
--      backstop. Without it, the deferred group_members_owner_invariant
--      trigger would fire at commit with a less helpful message.
--
--   2. Storage avatars cleanup. Avatars at avatars/{auth.uid}/<filename>
--      have no FK to profiles and aren't auto-cleaned by the cascade.
--      Targeting by foldername prefix — same path the avatars-owner-delete
--      RLS policy uses for the user themselves.
--
--   3. DELETE auth.users. Cascades through profiles (auth FK ON DELETE
--      CASCADE) and from there through every public-schema FK chain:
--      events, friendships, group_members, all *_user_shares tables,
--      major_events, shifts. Auth-side cascades cover refresh_tokens,
--      sessions, identities, mfa_factors via their own FKs to auth.users.
--
-- Direct DELETE FROM auth.users rather than auth.admin.deleteUser() —
-- the JS admin SDK can't be invoked from SQL, and the auth-schema FKs
-- cascade the same way regardless of which path triggers the delete.
-- This keeps the operation atomic in one transaction without an Edge
-- Function round-trip; the trade-off is that we bypass the official
-- admin-SDK envelope (logs, hooks). For a single-app indie project the
-- atomicity wins.
--
-- After RPC returns, the caller's existing JWT is technically still
-- parseable but refers to a deleted user. The client should immediately
-- signOut() to clear local session state and route the user back to the
-- landing page. Token refresh from any other logged-in device fails on
-- the next refresh attempt (refresh_tokens cascaded out), forcing those
-- sessions to sign out as well.
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
