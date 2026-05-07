import { supabase } from './supabase.js';

// Account-management helpers. Currently scoped to permanent self-deletion;
// the loadDeletionPreflight read powers the confirmation-modal copy AND
// the gating decision (refuse with list when caller still owns groups).
//
// The actual destruction lives server-side in the delete_my_account RPC
// (migration 20260504120000) — single transaction that pre-flight-refuses
// on owned groups, cleans avatar storage, and cascades through the FK
// chain. This file just wraps the JS surface around it.

// Pre-flight scan for the deletion-confirmation modal. Runs three RLS-
// filtered queries in parallel:
//
//   - ownedGroups: groups where the viewer holds role='owner'. Non-empty
//     here is the gating signal; the modal must refuse deletion until
//     each is transferred or deleted (mirrors leave_group's sole-owner
//     refusal). Returned as [{ id, name }] sorted by name for stable
//     rendering.
//
//   - eventCount: total events the viewer owns (counted via head:true
//     for cheap COUNT-only round-trip; no rows returned). Covers only
//     Supabase-backed events — major_events and shifts are still
//     localStorage-only and aren't counted here. The modal copy should
//     be specific ("X events on the server" rather than "all events").
//
//   - friendshipCount: total friendship rows the viewer is a party to,
//     counting both directions. Used as informed-consent copy in the
//     modal: "this will remove X friendships". Includes pending and
//     accepted alike — the user is severing all of them.
//
// Counts are 'exact' (not 'estimated') because the modal shows them to
// the user in destructive-confirmation copy; a heuristic count there
// would be misleading.
//
// Any of the three queries failing returns first-error; partial results
// are not surfaced. Caller should toast a retry message rather than
// proceed with stale-or-incomplete preflight data.
export async function loadDeletionPreflight(userId) {
  if (!userId) {
    return { ownedGroups: [], eventCount: 0, friendshipCount: 0, error: null };
  }

  const [groupsRes, eventsRes, friendsRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id, group:groups(id, name)')
      .eq('user_id', userId)
      .eq('role', 'owner'),
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId),
    supabase
      .from('friendships')
      .select('id', { count: 'exact', head: true }),
  ]);

  if (groupsRes.error)  return { ownedGroups: [], eventCount: 0, friendshipCount: 0, error: groupsRes.error };
  if (eventsRes.error)  return { ownedGroups: [], eventCount: 0, friendshipCount: 0, error: eventsRes.error };
  if (friendsRes.error) return { ownedGroups: [], eventCount: 0, friendshipCount: 0, error: friendsRes.error };

  const ownedGroups = (groupsRes.data || [])
    .map(r => r.group)
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ownedGroups,
    eventCount: eventsRes.count || 0,
    friendshipCount: friendsRes.count || 0,
    error: null,
  };
}

// Permanently delete the caller's account. Server-side RPC performs
// the destructive cascade in one transaction (see migration
// 20260504120000_delete_my_account_rpc).
//
// The RPC re-checks the owned-groups gate as a backstop and raises
// 'account has N owned group(s); transfer or delete them first' if
// the client somehow tried to call without preflight. UI should always
// pre-flight via loadDeletionPreflight first; this raise is a defense
// against a bug or race.
//
// On success, the caller's auth.users row no longer exists. The local
// JWT is technically still parseable until expiry, but any subsequent
// API call returns 401. Caller MUST signOut() immediately to clear the
// supabase-js session cache and route the user back to the landing page.
// Other devices logged in as the same user lose token-refresh on their
// next refresh attempt (auth.refresh_tokens cascaded out) and force-
// sign-out within the refresh-interval window.
export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account');
  return { error };
}

// Detect whether a user has any data on the server. Used at App mount to
// distinguish "truly new user" (seed local data, empty server) from
// "existing user, fresh cache" (no local data, full server). The latter
// case must skip onboarding — running onboarding's onFinish wipe path
// against an existing user's data is catastrophic (see commit history
// for the May 2026 incident).
//
// Counts rows across the four signals of user activity: shifts, events,
// major_events, and group memberships. group_members rather than groups
// because group ownership is via role='owner' on the membership row,
// not a direct column; any membership at all (owner or otherwise) means
// the user has been active.
//
// Fail-safe on error: returns true (assume existing user). Trade-off
// favors data preservation — a true new user with a transient network
// error doesn't see onboarding and lands in the main app with empty
// state, recoverable via Settings. The inverse (assume new and wipe)
// is the catastrophe we're preventing.
export async function hasServerData(userId) {
  if (!userId) return false;
  try {
    const [shiftsRes, eventsRes, majorRes, membershipRes] = await Promise.all([
      supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('major_events').select('id', { count: 'exact', head: true }).eq('owner_id', userId),
      supabase.from('group_members').select('group_id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);
    if (shiftsRes.error || eventsRes.error || majorRes.error || membershipRes.error) {
      console.warn('[account] hasServerData query failed; assuming existing user (fail-safe)',
        shiftsRes.error || eventsRes.error || majorRes.error || membershipRes.error);
      return true;
    }
    return (shiftsRes.count || 0) > 0
        || (eventsRes.count || 0) > 0
        || (majorRes.count  || 0) > 0
        || (membershipRes.count || 0) > 0;
  } catch (e) {
    console.warn('[account] hasServerData threw; assuming existing user (fail-safe)', e);
    return true;
  }
}
