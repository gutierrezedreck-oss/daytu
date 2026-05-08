// Format the contextual "shared by" / "shared in" label for events,
// major events, and shifts. Returns null when no label should render
// (own items, or no resolvable owner/group). Caller decides wrapper
// markup; this just produces the string.
//
// Priority follows the RPC's most-specific-path-wins rule: 'groups'
// with a known group name shows the group; everything else falls back
// to the owner. Group-without-name (RPC edge case, deleted-group race)
// falls back to owner rather than showing a bare "Shared".
export function formatShareLabel(item) {
  const path = item?._sharePath;
  if (!path || path === 'own') return null;
  const group = item?._shareGroupName;
  if (path === 'groups' && group) return `Shared in ${group}`;
  const owner = item?._ownerName;
  if (owner) return `Shared by ${owner}`;
  return null;
}
