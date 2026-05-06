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

// Inverse of isoToClientKey's date formatting: client (y, m, d) where m is
// 0-indexed, unpadded → server ISO YYYY-MM-DD (1-indexed, padded). Used by
// the row builders during migration / Phase 3 writes.
function ymdToIso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Parses a shiftOverrides Set entry or shiftTimeOverrides map key.
// Format: `<shiftId>:<y>-<m>-<d>` for kind='off', or
// `extra:<shiftId>:<y>-<m>-<d>` for kind='extra'. Used by the row builders
// and remap helpers below; module-internal because the key format is a
// client implementation detail.
function parseClientKey(key) {
  const isExtra = key.startsWith('extra:');
  const stripped = isExtra ? key.slice(6) : key;
  const colonIdx = stripped.indexOf(':');
  const shiftId = stripped.slice(0, colonIdx);
  const [y, m, d] = stripped.slice(colonIdx + 1).split('-').map(Number);
  return { shiftId, y, m, d, isExtra };
}

// Defensive boundary filter — never write a value that would fail the
// shifts.visibility CHECK constraint. The picker UI should already
// normalize 'inherit' (UI sentinel) to 'private' on save, but we
// belt-and-suspenders here so any future caller — or stale localStorage
// — can't trip the constraint. 'full_access' is a legacy chip retired
// in the Sharing migration; map it to 'friends' (broadest DB-valid)
// rather than dropping the user's intent on the floor.
function normalizeVisibility(v) {
  if (v === 'inherit')     return 'private';
  if (v === 'full_access') return 'friends';
  if (v === 'private' || v === 'friends' || v === 'groups' || v === 'people') return v;
  return 'private';
}

export function shiftToRow(s, ownerId) {
  return {
    id: s.id,
    owner_id: ownerId,
    name: s.name ?? null,
    type: s.type ?? null,
    color: s.color || null,
    priority: s.priority ?? null,
    config: s.config || {},
    visibility: normalizeVisibility(s.visibility),
  };
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

// Iterate the shiftOverrides Set, parse each composite key, remap the
// localShiftId → uuid via shiftIdRemap, and emit { shift_id, date, kind }
// rows ready for upsert. Orphan keys (referencing shifts not in the remap)
// are skipped — FK would reject them anyway.
export function shiftOverridesToRows(shiftOverrides, shiftIdRemap) {
  const rows = [];
  for (const key of shiftOverrides) {
    const { shiftId: localId, y, m, d, isExtra } = parseClientKey(key);
    const newShiftId = shiftIdRemap[localId];
    if (!newShiftId) continue;
    rows.push({
      shift_id: newShiftId,
      date: ymdToIso(y, m, d),
      kind: isExtra ? 'extra' : 'off',
    });
  }
  return rows;
}

// Iterate the shiftTimeOverrides object, parse each key, remap shiftId,
// emit { shift_id, date, start_time, end_time } rows. Orphan keys skipped.
// 'extra:' prefix shouldn't appear on time-override keys (only the on/off
// Set uses that prefix); defensive skip if encountered.
export function shiftTimeOverridesToRows(shiftTimeOverrides, shiftIdRemap) {
  const rows = [];
  for (const [key, value] of Object.entries(shiftTimeOverrides)) {
    const { shiftId: localId, y, m, d, isExtra } = parseClientKey(key);
    if (isExtra) continue;
    const newShiftId = shiftIdRemap[localId];
    if (!newShiftId) continue;
    rows.push({
      shift_id: newShiftId,
      date: ymdToIso(y, m, d),
      start_time: value.start,
      end_time: value.end,
    });
  }
  return rows;
}

// Walk the Set, swap each key's localShiftId portion for its UUID. Date
// portion preserved as-is (still client format: 0-indexed month, unpadded).
// Orphan keys (referencing shifts not in the remap) preserved as-is —
// matches the events Phase 2 `?? id` pattern so cleanup is decoupled
// from migration.
export function remapShiftOverridesKeys(shiftOverrides, shiftIdRemap) {
  const next = new Set();
  for (const key of shiftOverrides) {
    const { shiftId: localId, y, m, d, isExtra } = parseClientKey(key);
    const newShiftId = shiftIdRemap[localId];
    if (!newShiftId) {
      next.add(key);
      continue;
    }
    const newKey = `${newShiftId}:${y}-${m}-${d}`;
    next.add(isExtra ? `extra:${newKey}` : newKey);
  }
  return next;
}

// Walk the object, swap each key's localShiftId portion for its UUID.
// Values copied by reference — the {start, end} objects don't need cloning.
// Orphan keys preserved as-is.
export function remapShiftTimeOverridesKeys(shiftTimeOverrides, shiftIdRemap) {
  const next = {};
  for (const [key, value] of Object.entries(shiftTimeOverrides)) {
    const { shiftId: localId, y, m, d } = parseClientKey(key);
    const newShiftId = shiftIdRemap[localId];
    if (!newShiftId) {
      next[key] = value;
      continue;
    }
    next[`${newShiftId}:${y}-${m}-${d}`] = value;
  }
  return next;
}

// One-time migration helper. Generates a UUID for each local shift, builds
// a remap (oldStringId → uuid), and pushes three streams to Supabase:
// shifts (sequential, must land first for FK), then shift_day_overrides +
// shift_day_time_overrides in parallel (both reference shifts; independent
// of each other).
//
// Returns { remap, error }. If error is non-null, the caller MUST NOT set
// the migrated flag; we want the next load to retry. Pre-stamped UUIDs
// reused via the persisted remap make retries idempotent — already-inserted
// rows dedupe by their pre-assigned UUID (shifts) or composite PK
// (shift_id, date) (override tables).
export async function migrateLocalShiftsToSupabase(
  localShifts, localShiftOverrides, localShiftTimeOverrides, ownerId
) {
  if (!localShifts?.length) return { remap: {}, error: null };
  const isUuid = (s) =>
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const remap = {};
  const shiftRows = localShifts.map((s) => {
    const newId = isUuid(s.id) ? s.id : crypto.randomUUID();
    remap[s.id] = newId;
    return shiftToRow({ ...s, id: newId }, ownerId);
  });

  // Step 1: shifts must land first — FK from override tables references shifts.id.
  const { error: shiftsError } = await supabase
    .from('shifts')
    .upsert(shiftRows, { onConflict: 'id' });
  if (shiftsError) return { remap, error: shiftsError };

  // Step 2: override tables in parallel — both depend on shifts but not each other.
  const overrideRows = shiftOverridesToRows(localShiftOverrides, remap);
  const timeOverrideRows = shiftTimeOverridesToRows(localShiftTimeOverrides, remap);

  const ops = [];
  if (overrideRows.length) {
    ops.push(supabase.from('shift_day_overrides')
      .upsert(overrideRows, { onConflict: 'shift_id,date' }));
  }
  if (timeOverrideRows.length) {
    ops.push(supabase.from('shift_day_time_overrides')
      .upsert(timeOverrideRows, { onConflict: 'shift_id,date' }));
  }
  if (!ops.length) return { remap, error: null };

  const results = await Promise.allSettled(ops);
  const failed = results.find(r => r.status === 'rejected' || r.value?.error);
  if (failed) return { remap, error: failed.reason ?? failed.value.error };
  return { remap, error: null };
}

// dateToIso wraps ymdToIso for the common case where callers have a JS Date.
function dateToIso(date) {
  return ymdToIso(date.getFullYear(), date.getMonth(), date.getDate());
}

// ── Shift row CRUD ───────────────────────────────────────────────────────────

export async function insertShift(s, ownerId) {
  return supabase.from('shifts').insert(shiftToRow(s, ownerId));
}

export async function updateShiftRow(id, s, ownerId) {
  // Strip immutable cols from the patch — RLS rejects owner_id changes; id is
  // the lookup key, not part of the update payload.
  const { id: _id, owner_id: _o, ...patch } = shiftToRow(s, ownerId);
  return supabase.from('shifts').update(patch).eq('id', id);
}

export async function deleteShiftRow(id) {
  // FK cascades: shift_day_overrides, shift_day_time_overrides,
  // shift_group_shares, shift_user_shares all auto-cleanup.
  return supabase.from('shifts').delete().eq('id', id);
}

export async function deleteAllShiftsForOwner(ownerId) {
  // Wipes the user's shifts AND (via FK cascade) all their override and
  // share-target rows. Used by reset paths.
  return supabase.from('shifts').delete().eq('owner_id', ownerId);
}

// Bulk priority update for drag-to-reorder. Fires N parallel UPDATEs rather
// than a single upsert — PostgREST upsert sends the full row payload, which
// would clobber unrelated columns. Returns first error from the batch or null.
export async function reorderShifts(rows) {
  if (!rows.length) return { error: null };
  const ops = rows.map(({ id, priority }) =>
    supabase.from('shifts').update({ priority }).eq('id', id)
  );
  const results = await Promise.allSettled(ops);
  const failed = results.find(r => r.status === 'rejected' || r.value?.error);
  if (failed) return { error: failed.reason ?? failed.value.error };
  return { error: null };
}

// ── Override row CRUD ────────────────────────────────────────────────────────

export async function upsertShiftOverride(shiftId, date, kind) {
  return supabase.from('shift_day_overrides')
    .upsert({ shift_id: shiftId, date: dateToIso(date), kind },
            { onConflict: 'shift_id,date' });
}

// Filter by kind defensively — if local Set state diverged from server (rare
// edge case, e.g. concurrent toggle from another tab landed a different kind),
// don't over-delete the wrong-kind row. PK guarantees at most one row per
// (shift_id, date), so the filter is belt-and-suspenders.
export async function deleteShiftOverride(shiftId, date, kind) {
  return supabase.from('shift_day_overrides')
    .delete().eq('shift_id', shiftId).eq('date', dateToIso(date)).eq('kind', kind);
}

export async function upsertShiftTimeOverride(shiftId, date, startTime, endTime) {
  return supabase.from('shift_day_time_overrides')
    .upsert({
      shift_id: shiftId,
      date: dateToIso(date),
      start_time: startTime,
      end_time: endTime,
    }, { onConflict: 'shift_id,date' });
}

export async function deleteShiftTimeOverride(shiftId, date) {
  return supabase.from('shift_day_time_overrides')
    .delete().eq('shift_id', shiftId).eq('date', dateToIso(date));
}
