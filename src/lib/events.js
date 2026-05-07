import { supabase } from './supabase.js';

// ── client ↔ server shape mapping ────────────────────────────────────────────
//
// The events table only models fields that have query semantics on the
// server. Three client fields ride along in client_extras (jsonb) because
// the server doesn't query against them:
//
//   monthDays  — recurrence config when frequency = 'specific'
//   overrides  — per-occurrence skip/edit dictionary on recurring events
//   attendees  — informational labels (deferred until we model attendance)
//
// One additional field — calendarId — also lives in client_extras for now.
// Calendars are still a localStorage construct (`c1`, `c2`, …); the schema's
// events.calendar_id is uuid with no FK, but inserting a string like "c1"
// into a uuid column would type-error. Until calendars themselves migrate,
// we keep events.calendar_id null on the DB and round-trip the local string
// id through client_extras.calendarId. When calendars do migrate, we'll
// backfill events.calendar_id and stop reading from extras.
//
// groupIds and userIds round-trip via follow-up queries to event_group_shares
// and event_user_shares; the Postgres RLS policies on those tables already
// restrict reads to events I own, so the queries need no WHERE clause. Reads
// land in Phase 1 of the Sharing migration; writes (insert/delete share rows
// on event create/update) come in Phase 2.

function isoOrNull(dateOrString) {
  if (!dateOrString) return null;
  if (dateOrString instanceof Date) {
    const ms = dateOrString.getTime();
    return Number.isNaN(ms) ? null : dateOrString.toISOString();
  }
  return dateOrString;
}

function clientExtrasFromEvent(event) {
  const extras = {};
  if (event.calendarId != null) extras.calendarId = event.calendarId;
  if (event.attendees && event.attendees.length) extras.attendees = event.attendees;
  if (event.monthDays && Object.keys(event.monthDays).length) extras.monthDays = event.monthDays;
  if (event.overrides && Object.keys(event.overrides).length) extras.overrides = event.overrides;
  return Object.keys(extras).length ? extras : null;
}

// Defensive boundary filter — never write a value that would fail the
// events.visibility CHECK constraint. NewEventSheet should already
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

export function eventToRow(event, ownerId) {
  return {
    id: event.id,
    owner_id: ownerId,
    calendar_id: null,
    title: event.title ?? null,
    start_at: isoOrNull(event.start),
    end_at: isoOrNull(event.end),
    all_day: !!event.allDay,
    location: event.location || null,
    url: event.url || null,
    notes: event.notes || null,
    color: event.color || null,
    pinned: !!event.pinned,
    important: !!event.important,
    frequency: event.frequency || 'none',
    reminder: event.reminder ?? null,
    visibility: normalizeVisibility(event.visibility),
    client_extras: clientExtrasFromEvent(event),
  };
}

export function rowToEvent(row) {
  const extras = row.client_extras || {};
  const event = {
    id: row.id,
    title: row.title ?? '',
    calendarId: extras.calendarId ?? null,
    start: row.start_at ? new Date(row.start_at) : null,
    end: row.end_at ? new Date(row.end_at) : null,
    allDay: !!row.all_day,
    visibility: row.visibility || 'private',
    groupIds: [],
    userIds: [],
    reminder: row.reminder ?? null,
    frequency: row.frequency || 'none',
    location: row.location ?? '',
    color: row.color ?? null,
    url: row.url ?? '',
    attendees: extras.attendees ?? [],
    pinned: !!row.pinned,
    important: !!row.important,
    notes: row.notes ?? '',
  };
  if (extras.monthDays) event.monthDays = extras.monthDays;
  if (extras.overrides) event.overrides = extras.overrides;
  if (row.owner_name !== undefined) event._ownerName = row.owner_name;
  if (row.owner_handle !== undefined) event._ownerHandle = row.owner_handle;
  if (row.share_path !== undefined) event._sharePath = row.share_path;
  if (row.share_group_id !== undefined) event._shareGroupId = row.share_group_id;
  if (row.share_group_name !== undefined) event._shareGroupName = row.share_group_name;
  return event;
}

// ── I/O ──────────────────────────────────────────────────────────────────────

export async function loadEventsFromSupabase() {
  const [eventsRes, sharesRes] = await Promise.all([
    supabase.rpc('events_for_viewer'),
    loadShareTargetsForOwnedEvents(),
  ]);
  if (eventsRes.error) return { events: [], error: eventsRes.error };
  // Share-load failure is non-fatal — render events with empty share lists
  // rather than blanking the timeline. RLS or PostgREST hiccups on the share
  // tables shouldn't take the calendar down.
  if (sharesRes.error) console.warn('[events] share-load failed', sharesRes.error);
  const groupShares = sharesRes.error ? new Map() : sharesRes.groupSharesByEvent;
  const userShares  = sharesRes.error ? new Map() : sharesRes.userSharesByEvent;
  const events = (eventsRes.data || []).map((row) => {
    const ev = rowToEvent(row);
    ev.groupIds = groupShares.get(row.id) || [];
    ev.userIds  = userShares.get(row.id)  || [];
    return ev;
  });
  return { events, error: null };
}

// Fetch share-target rows for events I own, returning two Maps keyed by
// event_id. RLS on event_group_shares / event_user_shares restricts reads
// to rows where the underlying event is owned by auth.uid(), so unbounded
// SELECTs return only my-owned share rows — no WHERE clause needed.
//
// Events shared WITH the viewer (i.e. owned by someone else) intentionally
// produce no entries here. The viewer's events_for_viewer row already
// carries share_path / share_group_name for the "shared by" pill — knowing
// the full share list of someone else's event is neither needed nor
// permitted.
//
// Failure surfaces { error } and empty Maps; the caller renders events
// with empty groupIds/userIds rather than failing the whole load.
export async function loadShareTargetsForOwnedEvents() {
  const [groupRes, userRes] = await Promise.all([
    supabase.from('event_group_shares').select('event_id, group_id'),
    supabase.from('event_user_shares').select('event_id, user_id'),
  ]);
  if (groupRes.error) return { groupSharesByEvent: new Map(), userSharesByEvent: new Map(), error: groupRes.error };
  if (userRes.error)  return { groupSharesByEvent: new Map(), userSharesByEvent: new Map(), error: userRes.error };
  const groupSharesByEvent = new Map();
  const userSharesByEvent  = new Map();
  for (const r of groupRes.data || []) {
    if (!groupSharesByEvent.has(r.event_id)) groupSharesByEvent.set(r.event_id, []);
    groupSharesByEvent.get(r.event_id).push(r.group_id);
  }
  for (const r of userRes.data || []) {
    if (!userSharesByEvent.has(r.event_id)) userSharesByEvent.set(r.event_id, []);
    userSharesByEvent.get(r.event_id).push(r.user_id);
  }
  return { groupSharesByEvent, userSharesByEvent, error: null };
}

// Diff old/new share targets and write the four CRUD ops in parallel.
// Returns the first error from the batch (Promise.allSettled), or null
// on success / no-op.
//
// INSERT batches are filtered to UUID-only ids — belt-and-suspenders
// against any future stale-state path where a non-UUID local id (e.g.
// seed "g1") leaks into the picker. DELETE batches need no such filter;
// matching on a non-existent id is a server-side no-op.
//
// Caller is App.jsx's addEvent / duplicateEvent / updateEvent (series
// path), which fires this AFTER the events row write succeeds. Partial-
// failure handling is the caller's concern; this helper just surfaces
// what went wrong on the share write.
export async function diffAndWriteShares(
  eventId, oldGroupIds, oldUserIds, newGroupIds, newUserIds
) {
  const isUuid = (s) => typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

  const groupAdds    = newGroupIds.filter(id => !oldGroupIds.includes(id) && isUuid(id));
  const groupRemoves = oldGroupIds.filter(id => !newGroupIds.includes(id));
  const userAdds     = newUserIds.filter(id => !oldUserIds.includes(id) && isUuid(id));
  const userRemoves  = oldUserIds.filter(id => !newUserIds.includes(id));

  // No-op: nothing changed (or only non-UUID adds got stripped).
  if (!groupAdds.length && !groupRemoves.length && !userAdds.length && !userRemoves.length) {
    return { error: null };
  }

  const ops = [];
  if (groupAdds.length) {
    ops.push(supabase.from('event_group_shares').insert(
      groupAdds.map((group_id) => ({ event_id: eventId, group_id }))
    ));
  }
  if (groupRemoves.length) {
    ops.push(supabase.from('event_group_shares')
      .delete().eq('event_id', eventId).in('group_id', groupRemoves));
  }
  if (userAdds.length) {
    ops.push(supabase.from('event_user_shares').insert(
      userAdds.map((user_id) => ({ event_id: eventId, user_id }))
    ));
  }
  if (userRemoves.length) {
    ops.push(supabase.from('event_user_shares')
      .delete().eq('event_id', eventId).in('user_id', userRemoves));
  }

  const results = await Promise.allSettled(ops);
  const failed = results.find(r => r.status === 'rejected' || r.value?.error);
  if (failed) return { error: failed.reason ?? failed.value.error };
  return { error: null };
}

export async function insertEvent(event, ownerId) {
  return supabase.from('events').insert(eventToRow(event, ownerId));
}

export async function updateEventRow(eventId, event, ownerId) {
  // Strip immutable cols from the patch — RLS rejects owner_id changes; id is
  // the lookup key, not part of the update payload.
  const { id: _id, owner_id: _o, ...patch } = eventToRow(event, ownerId);
  const { data, error } = await supabase.from('events').update(patch).eq('id', eventId).select();
  if (error) return { data, error };
  // RLS-filtered UPDATE returns 0 rows with no error — surface as an explicit
  // error so the caller's revert path fires. Without this, a non-owner UPDATE
  // appears to succeed locally while the server is unchanged.
  if (!data || data.length === 0) return { data, error: new Error('events: 0 rows updated (RLS-rejected or row missing)') };
  return { data, error: null };
}

export async function deleteEventRow(eventId) {
  const { data, error } = await supabase.from('events').delete().eq('id', eventId).select();
  if (error) return { data, error };
  if (!data || data.length === 0) return { data, error: new Error('events: 0 rows deleted (RLS-rejected or row missing)') };
  return { data, error: null };
}

export async function deleteAllEventsForOwner(ownerId) {
  return supabase.from('events').delete().eq('owner_id', ownerId);
}

// One-time migration helper. Generates a UUID for each local event, builds a
// remap (oldStringId → uuid), and batch-upserts. Upsert with onConflict on id
// means a partial failure can be retried safely — already-inserted rows
// dedupe by their pre-assigned UUID.
//
// Returns { remap, error }. If error is non-null, the caller MUST NOT set the
// migrated flag; we want the next load to retry.
export async function migrateLocalEventsToSupabase(localEvents, ownerId) {
  if (!localEvents?.length) return { remap: {}, error: null };
  const isUuid = (s) =>
    typeof s === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const remap = {};
  const rows = localEvents.map((ev) => {
    // Caller may pre-stamp UUIDs (e.g. crash-recovery from a persisted remap)
    // so we honor an existing UUID id instead of generating a new one.
    const newId = isUuid(ev.id) ? ev.id : crypto.randomUUID();
    remap[ev.id] = newId;
    return eventToRow({ ...ev, id: newId }, ownerId);
  });
  const { error } = await supabase
    .from('events')
    .upsert(rows, { onConflict: 'id' });
  return { remap, error };
}
