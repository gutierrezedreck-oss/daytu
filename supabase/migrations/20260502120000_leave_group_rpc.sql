-- ============================================================================
-- leave_group(p_group)
--
-- Caller-initiated removal from a group. Mirrors transfer_group_ownership's
-- shape: SECURITY DEFINER so we can validate role + sole-owner invariant
-- atomically and return a deterministic error message.
--
-- Refuses if caller is the only owner. The partial unique index
-- group_members_one_owner_idx (see 20260424120000_social_layer.sql) enforces
-- exactly one owner per group, so role='owner' implies "I am the only
-- owner" — no count needed. Caller must transfer ownership before leaving.
-- Without this guard, the deferred group_members_owner_invariant trigger
-- would fire at commit time with a less helpful message.
-- ============================================================================

begin;

create or replace function public.leave_group(p_group uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_role text;
begin
  if me is null then raise exception 'not authenticated'; end if;

  my_role := public.group_role(me, p_group);
  if my_role is null then
    raise exception 'not a member of this group';
  end if;

  if my_role = 'owner' then
    raise exception 'sole owner cannot leave; transfer ownership first';
  end if;

  delete from public.group_members
    where group_id = p_group and user_id = me;
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;

commit;
