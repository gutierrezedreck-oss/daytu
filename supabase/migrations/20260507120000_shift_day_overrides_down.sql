-- ============================================================================
-- Reverses 20260507120000_shift_day_overrides.sql.
-- Drops both tables (cascades drop their RLS policies). All override data
-- is destroyed; back up beforehand if migration has been live long enough
-- for users to have populated rows (e.g. `create table shift_day_overrides_backup
-- as select * from public.shift_day_overrides;` and same for the time variant).
-- ============================================================================

begin;

drop table if exists public.shift_day_time_overrides;
drop table if exists public.shift_day_overrides;

commit;
