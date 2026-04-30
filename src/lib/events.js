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
// groupIds is intentionally NOT round-tripped — sharing UI is out of scope
// for this milestone, and every event we create or migrate is private.

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
    visibility: event.visibility || 'private',
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
  const { data, error } = await supabase.rpc('events_for_viewer');
  if (error) return { events: [], error };
  return { events: (data || []).map(rowToEvent), error: null };
}

export async function insertEvent(event, ownerId) {
  return supabase.from('events').insert(eventToRow(event, ownerId));
}

export async function updateEventRow(eventId, event, ownerId) {
  // Strip immutable cols from the patch — RLS rejects owner_id changes; id is
  // the lookup key, not part of the update payload.
  const { id: _id, owner_id: _o, ...patch } = eventToRow(event, ownerId);
  return supabase.from('events').update(patch).eq('id', eventId);
}

export async function deleteEventRow(eventId) {
  return supabase.from('events').delete().eq('id', eventId);
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
