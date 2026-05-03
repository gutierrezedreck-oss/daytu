import { supabase } from './supabase.js';

// Load all groups visible to the current viewer (RLS auto-filters to
// memberships) with embedded membership rows and member profiles via a
// single Supabase embedded select. Returns data already transformed to the
// local UI shape.
//
// Local shape:
//   groups[]:        { id, name, color, owner, memberListHidden }
//   groupMembers[]:  { groupId, userId, name, handle, avatar, role }
//
// Owner is derived from the group_members row with role='owner' and stored
// on the group as a denormalized `owner` field (matches the pre-Supabase
// local model). The owner row is filtered OUT of groupMembers — owner is
// implicit in groups[].owner. Phase 3 may consolidate; Phase 1 preserves
// the existing shape so the (currently flag-gated) UI doesn't need rewires.
export async function loadGroupsForViewer() {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id,
      name,
      color,
      member_list_hidden,
      members:group_members(
        user_id,
        role,
        profile:profiles(name, handle, avatar_url)
      )
    `);
  if (error) return { groups: [], members: [], error };

  const groups = [];
  const members = [];
  for (const g of (data || [])) {
    const ownerRow = g.members?.find((m) => m.role === 'owner');
    groups.push({
      id: g.id,
      name: g.name,
      color: g.color,
      owner: ownerRow?.user_id ?? null,
      memberListHidden: !!g.member_list_hidden,
    });
    for (const m of (g.members || [])) {
      if (m.role === 'owner') continue;
      const p = m.profile || {};
      members.push({
        groupId: g.id,
        userId: m.user_id,
        name: p.name || (p.handle ? `@${p.handle}` : 'Unknown'),
        handle: p.handle ?? null,
        avatar: p.avatar_url ?? null,
        role: m.role, // 'editor' | 'member'
      });
    }
  }
  return { groups, members, error: null };
}

// Resolve a handle to a profile. Used by the Phase 3 group-member-add flow
// to convert "@alice" → user_id at add-time. Callable today since profiles
// SELECT is open to authenticated users (same query backs handle search
// elsewhere). Strips a leading "@" and lowercases for canonical comparison.
export async function findUserByHandle(handle) {
  const cleaned = (handle || '').replace(/^@+/, '').toLowerCase();
  if (!cleaned) return { user: null, error: null };
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, handle, avatar_url')
    .ilike('handle', cleaned)
    .maybeSingle();
  if (error) return { user: null, error };
  return { user: data ?? null, error: null };
}

// ── Writes ──────────────────────────────────────────────────────────────
// All write helpers are thin wrappers — RLS and table constraints are
// authoritative. Helpers don't validate authorization client-side; they
// surface server errors via the standard supabase-js { data, error } shape
// (or, for RPCs that return void, just { error }). The createGroup helper
// is the one exception: it unwraps the RPC's data into { groupId } so the
// caller doesn't need to know the RPC returns the new UUID as `data`.

// Atomic group + owner-row insert via RPC. Awaited synchronously by the
// caller — the new group is only added to local state once the server
// returns the UUID, so no temp-ID reconciliation is needed. Trade-off:
// one round-trip of latency on the "Create Group" button (acceptable,
// groups are low-frequency).
export async function createGroup({ name, color }) {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_color: color,
  });
  if (error) return { groupId: null, error };
  return { groupId: data, error: null };
}

// Partial UPDATE on groups for owner-mutable fields. `fields` keys are
// allowlisted to { name, color, member_list_hidden } — anything else is
// silently dropped rather than forwarded, since RLS would reject changes
// to other columns and timestamps are managed by the groups_updated_at
// trigger. Field names are server-shape (snake_case) by convention with
// the design phase; caller maps from local memberListHidden.
export async function updateGroup(id, fields) {
  const patch = {};
  if (fields.name !== undefined) patch.name = fields.name;
  if (fields.color !== undefined) patch.color = fields.color;
  if (fields.member_list_hidden !== undefined) patch.member_list_hidden = fields.member_list_hidden;
  return supabase.from('groups').update(patch).eq('id', id);
}

// DELETE on groups. FK cascades handle group_members,
// event_group_shares, major_event_group_shares, and shift_group_shares.
// Renamed from deleteGroup to avoid collision with the App.jsx-side
// deleteGroup function that imports this. Same convention as
// deleteEventRow in events.js.
export async function deleteGroupRow(id) {
  return supabase.from('groups').delete().eq('id', id);
}

// INSERT into group_members. `role` is 'editor' | 'member' — owner role
// is established only by create_group / transfer_group_ownership RPCs;
// passing 'owner' here would also collide with the
// group_members_one_owner_idx partial unique index. Editor callers are
// further restricted to role='member' by RLS.
export async function addMember(groupId, userId, role) {
  return supabase.from('group_members').insert({
    group_id: groupId,
    user_id: userId,
    role,
  });
}

// DELETE from group_members. Owner can remove any non-owner row; editor
// can only remove role='member' rows (RLS-enforced). Owners themselves
// leave via leaveGroup(), which refuses sole owners.
export async function removeMember(groupId, userId) {
  return supabase.from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
}

// UPDATE group_members.role. Owner-only by RLS. Used by the
// editor ↔ member toggle. Setting role='owner' through this path is
// rejected by the partial unique index — use transferOwnership() instead.
export async function updateMemberRole(groupId, userId, role) {
  return supabase.from('group_members')
    .update({ role })
    .eq('group_id', groupId)
    .eq('user_id', userId);
}

// Atomic owner→editor + member→owner swap via RPC. Single statement so
// the deferred group_members_owner_invariant trigger doesn't see a
// zero-owner state mid-flight. Caller must currently be owner; new
// owner must already be a group member.
export async function transferOwnership(groupId, newOwnerId) {
  const { error } = await supabase.rpc('transfer_group_ownership', {
    p_group: groupId,
    p_new_owner: newOwnerId,
  });
  return { error };
}

// Caller-initiated removal via RPC. Refuses if caller is the sole owner
// with the literal message 'sole owner cannot leave; transfer ownership
// first' — callers can match on that to show a more helpful toast than
// the generic "Couldn't leave — reverted".
export async function leaveGroup(groupId) {
  const { error } = await supabase.rpc('leave_group', {
    p_group: groupId,
  });
  return { error };
}
