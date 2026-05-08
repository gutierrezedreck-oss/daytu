import { createClient } from '@supabase/supabase-js';
import { broadcastChannelLock } from './broadcastChannelLock.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  );
}

// Diagnostic — verify the singleton actually holds. If `totalCreates` ever
// goes above 1 in a single page load, the globalThis guard isn't catching
// the second module evaluation and we're spawning duplicate GoTrueClients,
// which deadlock on the shared localStorage auth lock.
const _hadCachedClient = !!globalThis.__daytuSupabase;
if (!_hadCachedClient) {
  globalThis.__daytuSupabaseCreateCount =
    (globalThis.__daytuSupabaseCreateCount ?? 0) + 1;
}

// Vite HMR re-evaluates this module on file changes in dev. Without a global
// cache, each re-evaluation calls createClient() again, leaving two (or more)
// GoTrueClient instances alive in the same tab — they fight over the same
// localStorage auth lock and silently deadlock. Cache the instance on
// globalThis so HMR reuses the original client and never instantiates a
// second one. Has no effect in production builds (single evaluation).
export const supabase =
  globalThis.__daytuSupabase ??
  (globalThis.__daytuSupabase = createClient(url, anonKey, {
    // GoTrueClient's default lock (navigatorLock, Web Locks API) self-wedges
    // on hard reload while signed in (HANDOFF #7). We previously substituted
    // processLock (in-memory, per-JS-context) which fixed that but lost
    // cross-tab serialization (HANDOFF #3). broadcastChannelLock is a custom
    // implementation: in-tab FIFO chain (processLock-style) plus cross-tab
    // coordination via BroadcastChannel with leader-election (probe → claim
    // → run, tie-break by (claimedAt, tabId) for simultaneous claims,
    // heartbeat + stale-out for crashed holders). Falls back to processLock
    // when BroadcastChannel is unavailable. See src/lib/broadcastChannelLock.js.
    auth: { lock: broadcastChannelLock },
  }));
