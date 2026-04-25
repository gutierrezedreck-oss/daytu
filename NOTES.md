# NOTES

Working notes for the `supabase-integration` branch. Not for `main`.

## Known issues (auth)

These are bugs found while building out the email + password auth flow. The
core flow works — sign-up, sign-in, sign-out, password reset — but the edges
have rough behavior. Workarounds noted for each.

### 1. Duplicate `SIGNED_IN` events on subsequent loads → watchdog hang
On a fresh sign-in after page reload (when localStorage has a stored session),
`onAuthStateChange` sometimes fires `SIGNED_IN` twice. The second invocation
re-enters AuthGate's handler while `loadProfile` from the first is still
in flight, contention follows, and the 8-second watchdog eventually flips
status to `error`.

**Likely cause:** StrictMode double-mounting AuthGate's `useEffect` is
leaving a previous subscription alive across remounts (cleanup not running
in time, or HMR-related), so two listeners receive the same event.

**Workaround:** clear `localStorage` (or the `sb-*` keys specifically) and
sign in fresh. After a clean sign-in the issue doesn't recur within the
same tab — only on subsequent reloads.

**Fix direction (later):** dedupe `SIGNED_IN` events with a same-session-id
guard in the handler, or track the active subscription via a ref so the
StrictMode double-mount is provably idempotent.

### 2. `resetPasswordForEmail` returns 422 in some cases
`supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })` occasionally
returns HTTP 422 instead of completing. Not yet reproducible on demand.

**Likely cause:** unclear. Could be email format edge case, an internal
Supabase validation, or rate-limit-adjacent behavior that surfaces as 422
rather than 429.

**Workaround:** wait a moment and resubmit; verify the email is well-formed.

**Fix direction (later):** capture the 422 response body next time it fires
to see exactly what's being rejected, then either translate to a friendly
message via `friendlyError` or fix the input shape.

### 3. Multi-tab navigator lock race on email link click
When a magic-link or password-reset email opens in a new tab while another
tab on the same origin is already live, the two `GoTrueClient` instances
contend for the Web Locks API auth lock. One tab can hang while the other
completes — symptom looks identical to the singleton issue we just fixed,
but is genuinely cross-tab.

**Likely cause:** the new tab spawns its own `GoTrueClient` (different
JS context, different `globalThis`), and Supabase's auth refresh logic
acquires a navigator lock keyed off the storageKey. Both tabs target the
same key, so they deadlock during refresh.

**Workaround:** close the original tab before clicking the link, **or**
sign in via password (which doesn't trigger the cross-tab race).

**Fix direction (later):** likely needs a coordinator (BroadcastChannel
or storage event listener) so the new tab notices the existing session
and either reuses it or signals the old tab to step aside. Or accept it
and explicitly recommend password sign-in for cross-device recovery.

### 4. `USER_UPDATED` after failed update triggers `loadProfile` loop
AuthGate's catch-all branch (handling `INITIAL_SESSION` / `SIGNED_IN` /
`USER_UPDATED`) calls `loadProfile` on every event in that group.
`USER_UPDATED` fires after a failed `updateUser` call too — which means
a failed reset-password or profile edit can cascade into an unwanted
`loadProfile`, which, combined with issue #1, can loop.

**Likely cause:** lumping `USER_UPDATED` with the sign-in events in the
handler. `USER_UPDATED` doesn't need a fresh profile fetch — the local
profile state should be reconciled targetedly, not via a full reload.

**Workaround:** refresh the page if the UI gets stuck after a failed
update.

**Fix direction (later):** split `USER_UPDATED` into its own branch — at
most update `session` from the new payload, leave `profile` and `status`
alone. Profile fields we own (handle, display name) get re-synced via
their own RPCs (`claim_handle`) anyway.

## Other notes

- Singleton fix (globalThis cache in `src/lib/supabase.js`) is in place and
  resolves the in-tab "Multiple GoTrueClient instances" warning from HMR.
  Cross-tab issue #3 is a separate problem.
- `npm run dev` console logs `[auth]` lines for diagnostic purposes —
  remove the `console.log` calls in `src/auth/AuthGate.jsx` once the four
  issues above are resolved.
- `src/auth/Welcome.jsx` is unchanged from the magic-link version — runs
  on first sign-in regardless of auth method.
