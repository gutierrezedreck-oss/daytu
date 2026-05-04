import { supabase } from './supabase.js';

// Load all friendships visible to the viewer (RLS filters to rows where
// viewer is user_lo or user_hi) with both parties' profiles via a single
// embedded select. Returns one array in the local UI shape — the same
// array the (flag-gated) Friends sub-tab already filters three ways by
// status, so Phase 3 can flip FEATURES.friends without UI rewires.
//
// Local shape:
//   { id, userId, name, handle, avatar, mutualGroups, status,
//     requestedAt, acceptedAt }
//   status: 'accepted' | 'pending_sent' | 'pending_received'
//
// viewerId is required because user_lo/user_hi are lex-ordered, not
// viewer-relative — picking "the other party" is a client-side concern.
// mutualGroups is 0 in Phase 1; Phase 3 derives it client-side from
// existing groupMembers state rather than asking the server.
export async function loadFriendsForViewer(viewerId) {
  if (!viewerId) return { friends: [], error: null };

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      user_lo,
      user_hi,
      requested_by,
      status,
      created_at,
      accepted_at,
      lo:profiles!user_lo(name, handle, avatar_url),
      hi:profiles!user_hi(name, handle, avatar_url)
    `);
  if (error) return { friends: [], error };

  const friends = [];
  for (const row of (data || [])) {
    const isLo = row.user_lo === viewerId;
    const otherId = isLo ? row.user_hi : row.user_lo;
    const otherProfile = (isLo ? row.hi : row.lo) || {};

    let status;
    if (row.status === 'accepted') status = 'accepted';
    else if (row.requested_by === viewerId) status = 'pending_sent';
    else status = 'pending_received';

    friends.push({
      id: row.id,
      userId: otherId,
      name: otherProfile.name || (otherProfile.handle ? `@${otherProfile.handle}` : 'Unknown'),
      handle: otherProfile.handle ?? null,
      avatar: otherProfile.avatar_url ?? null,
      mutualGroups: 0,
      status,
      requestedAt: row.created_at,
      acceptedAt: row.accepted_at,
    });
  }
  return { friends, error: null };
}
