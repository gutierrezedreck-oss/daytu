-- WARNING: this restores the recursion bug fixed by
-- 20260501120000_fix_group_members_select_recursion. Apply only for rollback.

drop policy if exists group_members_select on public.group_members;

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
