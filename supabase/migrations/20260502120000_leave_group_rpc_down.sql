-- Rollback for 20260502120000_leave_group_rpc.
-- Dropping the function removes its grants automatically; the explicit
-- revoke is for symmetry with the up file's grant.

begin;

revoke execute on function public.leave_group(uuid) from authenticated;
drop function if exists public.leave_group(uuid);

commit;
