// Custom Supabase auth lock: in-tab serialization (processLock-style FIFO
// chain) + cross-tab coordination (BroadcastChannel with leader election).
// Replaces processLock in src/lib/supabase.js. Implements the auth-js lock
// contract: (name, acquireTimeout, fn) => Promise<R>.
//
// Why this exists: navigatorLock deadlocks on hard reload (HANDOFF #7);
// processLock fixed that but loses cross-tab serialization (HANDOFF #3).
// This module gives us both: hard-reload-safe (no cross-page lifecycle
// state) AND cross-tab-coordinated (BC + heartbeats).
//
// Protocol per acquire:
//   Phase 1 (probe):  broadcast `request`. Listen T_PROBE for any holder's
//                     `granted` reply. If received, queue behind them.
//   Phase 2 (claim):  broadcast our own `granted` with claimedAt timestamp.
//                     Listen T_SETTLE for conflicting `granted`. Tie-break
//                     by lex compare of (claimedAt, tabId) — smaller wins.
//                     Loser yields, waits for winner's release, retries.
//   Phase 3 (run):    hold, broadcast `heartbeat` every T_HEARTBEAT. On
//                     finally, broadcast `release` and clear local state.
//
// Holder crash recovery: heartbeat-aging. If the held tab dies without
// posting `release`, other tabs see lastHeartbeat > T_STALE and treat the
// holder as released. `beforeunload` makes the common close case clean.
//
// Residual race: simultaneous claims in the T_SETTLE window can both
// proceed if one tab's grant doesn't reach the other in time. The server
// rejects the second refresh ("refresh token already used") — same as the
// pre-coordinator behavior, but the rate drops to a rare ms-scale window
// instead of every multi-tab refresh cycle.
//
// Falls back to processLock (in-tab only) when BroadcastChannel is
// unavailable, with a one-time console.warn.
//
// Debug: set localStorage["daytu.bcLock.debug"] = "true" for traces.

import { processLock } from '@supabase/auth-js';

const T_PROBE     = 200;   // ms — wait after `request` for any holder's reply
const T_SETTLE    = 100;   // ms — tie-break window after our own `granted`
const T_HEARTBEAT = 2000;  // ms — interval between heartbeats while holding
const T_STALE     = 5000;  // ms — declare holder dead after this gap
const CHANNEL     = 'daytu-auth-lock';
const GLOBAL_KEY  = '__daytuBcLock';
const DEBUG_KEY   = 'daytu.bcLock.debug';

// Matches the auth-js lock contract: callers (e.g. _autoRefreshTokenTick)
// detect timeout errors via `e.isAcquireTimeout === true`, never via
// instanceof. Defining our own decouples us from auth-js's internal
// LockAcquireTimeoutError (not re-exported from the package entry point).
class BroadcastChannelLockAcquireTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BroadcastChannelLockAcquireTimeoutError';
    this.isAcquireTimeout = true;
  }
}

// ── module state, cached on globalThis to survive HMR ───────────────────────
function getState() {
  if (!globalThis[GLOBAL_KEY]) globalThis[GLOBAL_KEY] = initState();
  return globalThis[GLOBAL_KEY];
}

function initState() {
  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[bcLock] BroadcastChannel unavailable; falling back to in-tab processLock. Cross-tab refresh races possible.');
    return { fallback: true };
  }
  let debug = false;
  try {
    debug = typeof localStorage !== 'undefined' && localStorage.getItem(DEBUG_KEY) === 'true';
  } catch { /* localStorage blocked; debug stays off */ }

  const state = {
    fallback: false,
    tabId: crypto.randomUUID(),
    bc: null,
    locks: new Map(),  // lockName → { localChain, holderState, observers }
    debug,
  };

  // ATOMIC INIT: construct BC, attach onmessage, register beforeunload —
  // all before this function returns. The first postMessage from any caller
  // happens after getState() resolves, so peer replies to our first probe
  // are guaranteed to find onmessage attached.
  state.bc = new BroadcastChannel(CHANNEL);
  state.bc.onmessage = (ev) => handleMessage(state, ev.data);
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      for (const [name, lock] of state.locks) {
        if (lock.holderState && lock.holderState.tabId === state.tabId) {
          try {
            state.bc.postMessage({ type: 'release', tabId: state.tabId, lockName: name });
          } catch { /* BC closing during unload */ }
        }
      }
    });
  }

  if (state.debug) console.log('[bcLock] init tabId=', state.tabId);
  return state;
}

function getLock(state, name) {
  let lock = state.locks.get(name);
  if (!lock) {
    lock = { localChain: Promise.resolve(), holderState: null, observers: new Set() };
    state.locks.set(name, lock);
  }
  return lock;
}

function notifyObservers(lock) {
  for (const cb of lock.observers) cb();
}

function isHolderStale(holderState) {
  return !holderState || (Date.now() - holderState.lastHeartbeat) > T_STALE;
}

// ── incoming message handler ────────────────────────────────────────────────
function handleMessage(state, msg) {
  if (!msg || !msg.type || !msg.lockName) return;
  if (state.debug) console.log('[bcLock] recv', msg);
  const lock = getLock(state, msg.lockName);

  switch (msg.type) {
    case 'request':
      // If I hold this lock, re-broadcast my granted so the requester queues.
      if (lock.holderState && lock.holderState.tabId === state.tabId) {
        state.bc.postMessage({
          type: 'granted',
          tabId: state.tabId,
          claimedAt: lock.holderState.claimedAt,
          lockName: msg.lockName,
        });
      }
      return;

    case 'granted':
      if (msg.tabId === state.tabId) return;  // BC doesn't loop self-posts; defensive
      // If I'm the holder, peer's claim is stale (e.g. they probed and missed
      // my grant). Reaffirm my hold — peer will see my granted and queue.
      if (lock.holderState && lock.holderState.tabId === state.tabId) {
        state.bc.postMessage({
          type: 'granted',
          tabId: state.tabId,
          claimedAt: lock.holderState.claimedAt,
          lockName: msg.lockName,
        });
        return;
      }
      lock.holderState = {
        tabId: msg.tabId,
        claimedAt: msg.claimedAt,
        lastHeartbeat: Date.now(),
      };
      notifyObservers(lock);
      return;

    case 'release':
      if (lock.holderState && lock.holderState.tabId === msg.tabId) {
        lock.holderState = null;
        notifyObservers(lock);
      }
      return;

    case 'heartbeat':
      if (lock.holderState && lock.holderState.tabId === msg.tabId) {
        lock.holderState.lastHeartbeat = Date.now();
      }
      return;
  }
}

// ── public entry point ──────────────────────────────────────────────────────
async function broadcastChannelLock(name, acquireTimeout, fn) {
  const state = getState();
  if (state.fallback) return processLock(name, acquireTimeout, fn);

  // In-tab FIFO chain. Subsequent callers in this tab wait behind us.
  const lock = getLock(state, name);
  const previousChain = lock.localChain;
  let releaseChain;
  const selfPromise = new Promise((res) => { releaseChain = res; });
  lock.localChain = selfPromise;

  try {
    await previousChain.catch(() => {});  // ignore previous's errors; we just need the slot
    return await crossTabAcquire(state, name, acquireTimeout, fn);
  } finally {
    releaseChain();
  }
}

// ── cross-tab acquire loop ──────────────────────────────────────────────────
async function crossTabAcquire(state, name, acquireTimeout, fn) {
  const deadline = acquireTimeout < 0 ? Infinity : Date.now() + acquireTimeout;
  const lock = getLock(state, name);

  // Strict acquireTimeout=0: probe synchronously, claim without T_SETTLE.
  // Skipping T_SETTLE preserves the contract ("throw immediately if can't
  // acquire without waiting"). Used by GoTrueClient's _autoRefreshTokenTick
  // (every 30s), which intentionally fast-fails and retries next tick.
  // Residual race in this mode: a freshly-opened tab's first tick may not
  // yet have received heartbeats from a peer holder; both tabs could then
  // refresh concurrently. Server rejection is the safety net; next tick
  // (30s later) sees the fresh token in storage and skips.
  if (acquireTimeout === 0) {
    if (lock.holderState && !isHolderStale(lock.holderState) && lock.holderState.tabId !== state.tabId) {
      throw new BroadcastChannelLockAcquireTimeoutError(`Lock "${name}" not immediately available`);
    }
    const myClaimedAt = Date.now();
    state.bc.postMessage({ type: 'granted', tabId: state.tabId, claimedAt: myClaimedAt, lockName: name });
    return runHolding(state, name, fn, myClaimedAt);
  }

  // Fast path: no peer holder visible at acquire time. Claim immediately
  // and run fn() — skip Phase 1/2 entirely. This avoids the 300ms window
  // during which auth-js's `lockAcquired` flag would still be false; any
  // re-entrant `_acquireLock` calls inside that window would otherwise
  // hit auth-js's OUTER branch, call this.lock() again, and serialize on
  // our localChain — a priority-inversion deadlock with auth-js's drain
  // loop (which holds lockAcquired=true and waits for the queued op to
  // complete).
  //
  // Trade-off: when two tabs both have empty holderState and both acquire
  // at the same instant, both fast-path through and may both run fn()
  // concurrently. Server-side rejection of duplicate refresh tokens is
  // the safety net (same residual behavior as processLock today, just
  // narrowed to the genuinely-concurrent case).
  if (!lock.holderState || isHolderStale(lock.holderState) || lock.holderState.tabId === state.tabId) {
    const myClaimedAt = Date.now();
    state.bc.postMessage({ type: 'granted', tabId: state.tabId, claimedAt: myClaimedAt, lockName: name });
    return runHolding(state, name, fn, myClaimedAt);
  }

  // Slow path: a peer is holding (or claiming). Run the full probe → claim
  // → tie-break protocol so multiple waiters who wake up on the same
  // release can coordinate among themselves.
  while (true) {
    if (Date.now() >= deadline) {
      throw new BroadcastChannelLockAcquireTimeoutError(`Acquiring lock "${name}" timed out`);
    }

    // Phase 1: Probe.
    state.bc.postMessage({ type: 'request', tabId: state.tabId, lockName: name });
    const holder = await waitForGrant(lock, state.tabId, T_PROBE, deadline);
    if (holder) {
      await waitForHolderClear(lock, holder.tabId, deadline);
      continue;
    }

    // Phase 2: Claim.
    const myClaimedAt = Date.now();
    state.bc.postMessage({ type: 'granted', tabId: state.tabId, claimedAt: myClaimedAt, lockName: name });
    const conflict = await collectConflictingGrant(state.bc, name, T_SETTLE, myClaimedAt, state.tabId);
    if (conflict) {
      await waitForHolderClear(lock, conflict.tabId, deadline);
      continue;
    }

    // Phase 3: Run.
    return runHolding(state, name, fn, myClaimedAt);
  }
}

async function runHolding(state, name, fn, claimedAt) {
  const lock = getLock(state, name);
  lock.holderState = { tabId: state.tabId, claimedAt, lastHeartbeat: claimedAt };
  notifyObservers(lock);

  const heartbeatTimer = setInterval(() => {
    state.bc.postMessage({ type: 'heartbeat', tabId: state.tabId, lockName: name });
  }, T_HEARTBEAT);

  if (state.debug) console.log('[bcLock] holding', name);

  try {
    return await fn();
  } finally {
    clearInterval(heartbeatTimer);
    state.bc.postMessage({ type: 'release', tabId: state.tabId, lockName: name });
    lock.holderState = null;
    notifyObservers(lock);
    if (state.debug) console.log('[bcLock] released', name);
  }
}

// ── helpers: state-change waits ─────────────────────────────────────────────
// Resolves with a holder's identity if a non-self granted reaches us within
// probeMs (or before deadline), or null on timeout. Observers fire on
// holderState changes via handleMessage.
function waitForGrant(lock, selfTabId, probeMs, deadline) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      lock.observers.delete(observer);
      clearTimeout(timer);
      resolve(value);
    };
    const observer = () => {
      if (lock.holderState && lock.holderState.tabId !== selfTabId && !isHolderStale(lock.holderState)) {
        finish({ tabId: lock.holderState.tabId, claimedAt: lock.holderState.claimedAt });
      }
    };
    lock.observers.add(observer);
    const wait = Math.min(probeMs, Math.max(0, deadline - Date.now()));
    const timer = setTimeout(() => finish(null), wait);
    observer();  // synchronous initial check
  });
}

// Wait until the named holder either releases, goes stale, or the deadline
// hits. Returns no value; caller checks deadline after to decide whether to
// retry or throw.
function waitForHolderClear(lock, expectedTabId, deadline) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      lock.observers.delete(observer);
      clearInterval(staleTicker);
      clearTimeout(deadlineTimer);
      resolve();
    };
    const observer = () => {
      if (!lock.holderState) return finish();
      if (lock.holderState.tabId !== expectedTabId) return finish();
      if (isHolderStale(lock.holderState)) {
        // Holder went silent. Treat as released.
        lock.holderState = null;
        finish();
      }
    };
    lock.observers.add(observer);
    // Periodic re-check so a stale-out resolves even with no incoming traffic.
    const staleTicker = setInterval(observer, 1000);
    const deadlineTimer = setTimeout(finish, Math.max(0, deadline - Date.now()));
    observer();  // synchronous initial check
  });
}

// During T_SETTLE after our own granted: capture any conflicting peer claim
// with smaller (claimedAt, tabId). Tie-break: smaller wins.
function collectConflictingGrant(bc, name, settleMs, myClaimedAt, myTabId) {
  return new Promise((resolve) => {
    let bestConflict = null;
    const handler = (ev) => {
      const msg = ev.data;
      if (!msg || msg.type !== 'granted' || msg.lockName !== name || msg.tabId === myTabId) return;
      const isSmaller =
        msg.claimedAt < myClaimedAt ||
        (msg.claimedAt === myClaimedAt && msg.tabId < myTabId);
      if (!isSmaller) return;
      if (!bestConflict ||
          msg.claimedAt < bestConflict.claimedAt ||
          (msg.claimedAt === bestConflict.claimedAt && msg.tabId < bestConflict.tabId)) {
        bestConflict = { tabId: msg.tabId, claimedAt: msg.claimedAt };
      }
    };
    bc.addEventListener('message', handler);
    setTimeout(() => {
      bc.removeEventListener('message', handler);
      resolve(bestConflict);
    }, settleMs);
  });
}

export { broadcastChannelLock, BroadcastChannelLockAcquireTimeoutError };
