-- ============================================================================
-- Fix infinite recursion in group_members_select RLS policy.
--
-- The original policy (in 20260424120000_social_layer.sql:696) used an
-- inline EXISTS subquery against public.group_members from within its own
-- SELECT policy. Postgres applies the policy's USING clause to the inner
-- subquery, which re-triggers the same policy — infinite recursion, error
-- 42P17.
--
-- The is_group_member(uuid, uuid) helper (line 217 of the same migration)
-- is SECURITY DEFINER, so it bypasses RLS and breaks the recursion. The
-- function is functionally identical to the inline subquery — both check
-- "is the given user a member of the given group?".
--
-- Surface: the bug never triggered until a real client query embedded
-- group_members under groups (loadGroupsForViewer in src/lib/groups.js).
-- The events_for_viewer() / major_events_for_viewer() / shifts_for_viewer()
-- reader RPCs are SECURITY DEFINER and bypass the policy entirely.
-- ============================================================================

drop policy if exists group_members_select on public.group_members;

create policy group_members_select on public.group_members
  for select to authenticated using (
    public.is_group_member(auth.uid(), group_members.group_id)
    and (
      not (select g.member_list_hidden from public.groups g where g.id = group_members.group_id)
      or public.group_role(auth.uid(), group_members.group_id) in ('owner','editor')
      or group_members.user_id = auth.uid()
    )
  );
