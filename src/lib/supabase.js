import { createClient } from '@supabase/supabase-js';
// processLock is not re-exported from supabase-js; we pull it from the
// auth-js transitive dep directly. Bundled in lockstep with supabase-js
// (both at 2.104.1 today). If a future supabase-js bump moves auth-js
// out of the hoist or changes its export surface, this import is the
// thing that'll break first.
import { processLock } from '@supabase/auth-js';

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
    // on hard reload while signed in: it acquires the lock for session
    // recovery and never releases — every subsequent request hangs inside
    // the locked critical section despite a 200 at the network layer
    // (HANDOFF #7, diagnosed 2026-04-29). Override to processLock (in-memory
    // promise chain) — no cross-page-lifecycle state, so a hard reload starts
    // clean. Trade-off: doesn't serialize across tabs; multi-tab token-
    // refresh races become possible (already documented as HANDOFF #3).
    auth: { lock: processLock },
  }));

console.log('[supabase-debug] module evaluated', {
  reusedCached: _hadCachedClient,
  totalCreates: globalThis.__daytuSupabaseCreateCount ?? 0,
});

// Lock-state checkpoint #1: immediately after createClient. If a stale GoTrue
// auth lock survived a previous tab/page-lifecycle, it should already be
// visible here. async IIFE because module top-level await isn't universally
// supported.
if (!_hadCachedClient && typeof navigator !== 'undefined' && navigator.locks?.query) {
  (async () => {
    try {
      const locks = await navigator.locks.query();
      console.log(
        '[supabase-debug] navigator.locks at client creation',
        JSON.stringify(locks, null, 2),
      );
    } catch (err) {
      console.warn('[supabase-debug] navigator.locks.query failed', err);
    }
  })();
}
