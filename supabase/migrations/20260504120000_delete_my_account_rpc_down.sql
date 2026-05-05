-- Rollback for 20260504120000_delete_my_account_rpc.

begin;

revoke execute on function public.delete_my_account() from authenticated;
drop function if exists public.delete_my_account();

commit;
