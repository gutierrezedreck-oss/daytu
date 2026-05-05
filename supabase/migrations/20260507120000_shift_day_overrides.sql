-- ============================================================================
-- daytu — shift_day_overrides + shift_day_time_overrides
--
-- Persists per-day exceptions to a shift's pattern:
--   * shift_day_overrides: on/off toggles for specific dates. kind='off'
--     hides a day the pattern would naturally include; kind='extra' adds a
--     day the pattern would naturally exclude. Mutually exclusive per
--     (shift_id, date) — the PK enforces this.
--   * shift_day_time_overrides: per-date start/end time replacements (e.g.
--     "half day this Thursday"). Times stored as HH:MM text — matches the
--     client's existing shape; trades off Postgres time arithmetic for
--     serialization-edge-case avoidance. Strict CHECK regex prevents
--     garbage rows. Overnight shifts (e.g. 22:00–06:00) work because the
--     constraint applies per-value, not pair-wise.
--
-- These were previously client-side only (shiftOverrides Set,
-- shiftTimeOverrides map in App.jsx). Moving server-side so the user's
-- schedule renders identically on every device, AND so shared shifts
-- expose the owner's actual schedule (not just the bare pattern).
--
-- RLS divergence from share-target tables (event_*_shares / shift_*_shares):
-- those keep SELECT owner-only because viewers receive share metadata via
-- the reader RPCs (events_for_viewer etc). Override tables instead have a
-- permissive SELECT via can_see_shift — viewers need raw override rows to
-- render the owner's actual schedule, not just enrichment metadata. Writes
-- (INSERT/UPDATE/DELETE) remain owner-only via shift ownership.
--
-- 4 policies per table (one per operation) matches the parent-table
-- precedent in shifts/events/major_events. More verbose than a 2-policy
-- variant (FOR SELECT permissive + FOR ALL owner-only) but per-operation
-- explicit and easier to audit.
-- ============================================================================

begin;

-- shift_day_overrides ---------------------------------------------------------
create table public.shift_day_overrides (
  shift_id  uuid not null references public.shifts(id) on delete cascade,
  date      date not null,
  kind      text not null check (kind in ('off','extra')),
  primary key (shift_id, date)
);

alter table public.shift_day_overrides enable row level security;

create policy shift_day_overrides_select on public.shift_day_overrides
  for select to authenticated
  using (exists (
    select 1 from public.shifts s
    where s.id = shift_id and public.can_see_shift(auth.uid(), s)
  ));

create policy shift_day_overrides_insert on public.shift_day_overrides
  for insert to authenticated
  with check (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ));

create policy shift_day_overrides_update on public.shift_day_overrides
  for update to authenticated
  using (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ));

create policy shift_day_overrides_delete on public.shift_day_overrides
  for delete to authenticated
  using (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ));

-- shift_day_time_overrides ----------------------------------------------------
create table public.shift_day_time_overrides (
  shift_id    uuid not null references public.shifts(id) on delete cascade,
  date        date not null,
  start_time  text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time    text not null check (end_time   ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  primary key (shift_id, date)
);

alter table public.shift_day_time_overrides enable row level security;

create policy shift_day_time_overrides_select on public.shift_day_time_overrides
  for select to authenticated
  using (exists (
    select 1 from public.shifts s
    where s.id = shift_id and public.can_see_shift(auth.uid(), s)
  ));

create policy shift_day_time_overrides_insert on public.shift_day_time_overrides
  for insert to authenticated
  with check (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ));

create policy shift_day_time_overrides_update on public.shift_day_time_overrides
  for update to authenticated
  using (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ));

create policy shift_day_time_overrides_delete on public.shift_day_time_overrides
  for delete to authenticated
  using (exists (
    select 1 from public.shifts s
    where s.id = shift_id and s.owner_id = auth.uid()
  ));

commit;
