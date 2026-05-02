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
