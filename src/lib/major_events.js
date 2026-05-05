import { supabase } from './supabase.js';

// ── client ↔ server shape mapping ────────────────────────────────────────────
//
// Major events round-trip cleanly — every server column maps to a client
// field (modulo snake_case → camelCase) and there's no client_extras detour
// like events have. The two share-target tables (major_event_group_shares,
// major_event_user_shares) carry groupIds and userIds for owned major events;
// reads land here in Phase 1, writes come in Phase 4.

export function rowToMajorEvent(row) {
  const me = {
    id: row.id,
    title: row.title ?? '',
    color: row.color ?? null,
    showCountdown: !!row.show_countdown,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    allDay: !!row.all_day,
    notes: row.notes ?? '',
    location: row.location ?? '',
    url: row.url ?? '',
    visibility: row.visibility || 'private',
    groupIds: [],
    userIds: [],
  };
  if (row.owner_name !== undefined)       me._ownerName = row.owner_name;
  if (row.owner_handle !== undefined)     me._ownerHandle = row.owner_handle;
  if (row.share_path !== undefined)       me._sharePath = row.share_path;
  if (row.share_group_id !== undefined)   me._shareGroupId = row.share_group_id;
  if (row.share_group_name !== undefined) me._shareGroupName = row.share_group_name;
  return me;
}

// ── I/O ──────────────────────────────────────────────────────────────────────

export async function loadMajorEventsFromSupabase() {
  const [eventsRes, sharesRes] = await Promise.all([
    supabase.rpc('major_events_for_viewer'),
    loadShareTargetsForOwnedMajorEvents(),
  ]);
  if (eventsRes.error) return { majorEvents: [], error: eventsRes.error };
  // Share-load failure is non-fatal — render with empty share lists rather
  // than blanking the major events list. RLS or PostgREST hiccups on the
  // share tables shouldn't take the page down.
  if (sharesRes.error) console.warn('[major_events] share-load failed', sharesRes.error);
  const groupShares = sharesRes.error ? new Map() : sharesRes.groupSharesByEvent;
  const userShares  = sharesRes.error ? new Map() : sharesRes.userSharesByEvent;
  const majorEvents = (eventsRes.data || []).map((row) => {
    const me = rowToMajorEvent(row);
    me.groupIds = groupShares.get(row.id) || [];
    me.userIds  = userShares.get(row.id)  || [];
    return me;
  });
  return { majorEvents, error: null };
}

// Fetch share-target rows for major events I own, keyed by major_event_id.
// RLS restricts reads to rows where the underlying major event is owned by
// auth.uid(), so unbounded SELECTs return only my-owned share rows — no
// WHERE clause needed.
//
// Major events shared WITH the viewer (owned by someone else) intentionally
// produce no entries here. The viewer's major_events_for_viewer row already
// carries share_path / share_group_name for the "shared by" pill.
export async function loadShareTargetsForOwnedMajorEvents() {
  const [groupRes, userRes] = await Promise.all([
    supabase.from('major_event_group_shares').select('major_event_id, group_id'),
    supabase.from('major_event_user_shares').select('major_event_id, user_id'),
  ]);
  if (groupRes.error) return { groupSharesByEvent: new Map(), userSharesByEvent: new Map(), error: groupRes.error };
  if (userRes.error)  return { groupSharesByEvent: new Map(), userSharesByEvent: new Map(), error: userRes.error };
  const groupSharesByEvent = new Map();
  const userSharesByEvent  = new Map();
  for (const r of groupRes.data || []) {
    if (!groupSharesByEvent.has(r.major_event_id)) groupSharesByEvent.set(r.major_event_id, []);
    groupSharesByEvent.get(r.major_event_id).push(r.group_id);
  }
  for (const r of userRes.data || []) {
    if (!userSharesByEvent.has(r.major_event_id)) userSharesByEvent.set(r.major_event_id, []);
    userSharesByEvent.get(r.major_event_id).push(r.user_id);
  }
  return { groupSharesByEvent, userSharesByEvent, error: null };
}
