import { supabase } from './supabase.js';

// ── client ↔ server shape mapping ────────────────────────────────────────────
//
// Shifts are richer than events/major_events: in addition to the row + share
// targets, each shift has two streams of per-day exceptions stored in
// dedicated tables (shift_day_overrides, shift_day_time_overrides). All
// four pieces fetch in parallel from loadShiftsFromSupabase.
//
// Override and time-override rows are NOT attached to the shift object.
// They live in separate React state in App.jsx (shiftOverrides Set,
// shiftTimeOverrides map), keyed by `${shiftId}:${y}-${m}-${d}` where
// y/m/d come from JS Date.getFullYear/getMonth/getDate — month is
// 0-INDEXED and unpadded. Server date columns return ISO YYYY-MM-DD
// (1-indexed, padded). isoToClientKey bridges the two on read; Phase 3
// will add the inverse for writes. Long-term, the client format should
// migrate to ISO too — that's a separate cleanup commit.

// Server ISO date (YYYY-MM-DD, 1-indexed month, padded) →
// client key fragment (y-m-d, 0-indexed month, unpadded). Keeps the
// loaded Set/map keys compatible with the client's existing
// overrideKey() output until the eventual format-unification cleanup.
function isoToClientKey(shiftId, isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${shiftId}:${y}-${m - 1}-${d}`;
}

export function rowToShift(row) {
  const s = {
    id: row.id,
    name: row.name ?? '',
    type: row.type || null,
    color: row.color ?? null,
    priority: row.priority ?? 0,
    config: row.config || {},
    visibility: row.visibility || 'private',
    groupIds: [],
    userIds: [],
  };
  if (row.owner_name !== undefined)       s._ownerName = row.owner_name;
  if (row.owner_handle !== undefined)     s._ownerHandle = row.owner_handle;
  if (row.share_path !== undefined)       s._sharePath = row.share_path;
  if (row.share_group_id !== undefined)   s._shareGroupId = row.share_group_id;
  if (row.share_group_name !== undefined) s._shareGroupName = row.share_group_name;
  return s;
}

// ── I/O ──────────────────────────────────────────────────────────────────────

export async function loadShiftsFromSupabase() {
  const [shiftsRes, sharesRes, overridesRes, timeOverridesRes] = await Promise.all([
    supabase.rpc('shifts_for_viewer'),
    loadShareTargetsForOwnedShifts(),
    loadOverridesForVisibleShifts(),
    loadTimeOverridesForVisibleShifts(),
  ]);
  if (shiftsRes.error) {
    return {
      shifts: [],
      shiftOverrides: new Set(),
      shiftTimeOverrides: {},
      error: shiftsRes.error,
    };
  }
  // Each of the other three failing is non-fatal — render shifts with empty
  // shares/overrides rather than blanking the timeline. RLS or PostgREST
  // hiccups on secondary tables shouldn't take the page down.
  if (sharesRes.error)        console.warn('[shifts] share-load failed', sharesRes.error);
  if (overridesRes.error)     console.warn('[shifts] override-load failed', overridesRes.error);
  if (timeOverridesRes.error) console.warn('[shifts] time-override-load failed', timeOverridesRes.error);

  const groupShares      = sharesRes.error        ? new Map() : sharesRes.groupSharesByShift;
  const userShares       = sharesRes.error        ? new Map() : sharesRes.userSharesByShift;
  const overridesMap     = overridesRes.error     ? new Map() : overridesRes.overridesByShift;
  const timeOverridesMap = timeOverridesRes.error ? new Map() : timeOverridesRes.timeOverridesByShift;

  const shifts = (shiftsRes.data || []).map((row) => {
    const s = rowToShift(row);
    s.groupIds = groupShares.get(row.id) || [];
    s.userIds  = userShares.get(row.id)  || [];
    return s;
  });

  // Flatten overrides into the client Set. kind='off' → bare key;
  // kind='extra' → 'extra:'-prefixed key. Matches the client's existing
  // toggleShiftOverride / onAddManualDay key conventions.
  const shiftOverrides = new Set();
  for (const [shiftId, rows] of overridesMap) {
    for (const row of rows) {
      const clientKey = isoToClientKey(shiftId, row.date);
      shiftOverrides.add(row.kind === 'extra' ? `extra:${clientKey}` : clientKey);
    }
  }

  const shiftTimeOverrides = {};
  for (const [shiftId, rows] of timeOverridesMap) {
    for (const row of rows) {
      const clientKey = isoToClientKey(shiftId, row.date);
      shiftTimeOverrides[clientKey] = { start: row.start_time, end: row.end_time };
    }
  }

  return { shifts, shiftOverrides, shiftTimeOverrides, error: null };
}

// Fetch share-target rows for shifts I own, keyed by shift_id.
// RLS on shift_group_shares / shift_user_shares restricts reads to rows
// where the underlying shift is owned by auth.uid(), so unbounded SELECTs
// return only my-owned share rows — no WHERE clause needed.
//
// Shifts shared WITH the viewer (owned by someone else) intentionally
// produce no entries here. The viewer's shifts_for_viewer row already
// carries share_path / share_group_name for the "shared by" pill.
export async function loadShareTargetsForOwnedShifts() {
  const [groupRes, userRes] = await Promise.all([
    supabase.from('shift_group_shares').select('shift_id, group_id'),
    supabase.from('shift_user_shares').select('shift_id, user_id'),
  ]);
  if (groupRes.error) return { groupSharesByShift: new Map(), userSharesByShift: new Map(), error: groupRes.error };
  if (userRes.error)  return { groupSharesByShift: new Map(), userSharesByShift: new Map(), error: userRes.error };
  const groupSharesByShift = new Map();
  const userSharesByShift  = new Map();
  for (const r of groupRes.data || []) {
    if (!groupSharesByShift.has(r.shift_id)) groupSharesByShift.set(r.shift_id, []);
    groupSharesByShift.get(r.shift_id).push(r.group_id);
  }
  for (const r of userRes.data || []) {
    if (!userSharesByShift.has(r.shift_id)) userSharesByShift.set(r.shift_id, []);
    userSharesByShift.get(r.shift_id).push(r.user_id);
  }
  return { groupSharesByShift, userSharesByShift, error: null };
}

// Fetch day-on/off override rows for all shifts the viewer can see.
// RLS SELECT is permissive via can_see_shift — returns rows for owned
// AND shared-with-viewer shifts. Intentional: viewers need the owner's
// actual schedule (pattern + exceptions) to render shared shifts
// accurately.
//
// Returns a Map keyed by shift_id, value is an array of { date, kind }
// rows. loadShiftsFromSupabase flattens it into a Set.
export async function loadOverridesForVisibleShifts() {
  const { data, error } = await supabase
    .from('shift_day_overrides')
    .select('shift_id, date, kind');
  if (error) return { overridesByShift: new Map(), error };
  const overridesByShift = new Map();
  for (const r of data || []) {
    if (!overridesByShift.has(r.shift_id)) overridesByShift.set(r.shift_id, []);
    overridesByShift.get(r.shift_id).push({ date: r.date, kind: r.kind });
  }
  return { overridesByShift, error: null };
}

// Fetch per-day time-override rows for all shifts the viewer can see.
// Same RLS semantics as loadOverridesForVisibleShifts.
//
// Returns a Map keyed by shift_id, value is an array of
// { date, start_time, end_time } rows. loadShiftsFromSupabase flattens
// it into the client's shiftTimeOverrides object map.
export async function loadTimeOverridesForVisibleShifts() {
  const { data, error } = await supabase
    .from('shift_day_time_overrides')
    .select('shift_id, date, start_time, end_time');
  if (error) return { timeOverridesByShift: new Map(), error };
  const timeOverridesByShift = new Map();
  for (const r of data || []) {
    if (!timeOverridesByShift.has(r.shift_id)) timeOverridesByShift.set(r.shift_id, []);
    timeOverridesByShift.get(r.shift_id).push({
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
    });
  }
  return { timeOverridesByShift, error: null };
}
