# HANDOFF — Supabase integration

Status snapshot for picking this back up after time away.

**Branch:** `supabase-integration` (not `main`).
**Last commit at handoff:** `e7f6eb7` — "Add email + password auth, handle picker, and known-issues notes."
**Production:** Vercel deploys from `main`, so `daytu.app` is not affected by this branch.

---

## What's working end-to-end

Backend (Supabase, both migrations applied):

- **Schema:** `profiles`, `friendships`, `groups` + `group_members` (with owner/editor/member roles and member-list privacy toggle), `events` / `major_events` / `shifts` and their `*_group_shares` / `*_user_shares` target tables. RLS on every table, scoped by `is_friend()` + `can_see_*()` predicates so unfriending revokes visibility at query time without touching share rows.
- **Reader functions:** `events_for_viewer()`, `major_events_for_viewer()`, `shifts_for_viewer()` — return rows the caller can see plus `share_path`, `share_group_id`, `share_group_name`, `owner_name`, `owner_handle` for the "shared by" pill UI.
- **RPCs:** `send_friend_request`, `accept_friend_request`, `unfriend`, `create_group`, `transfer_group_ownership`, `handle_available`, `claim_handle`.
- **Triggers:** auto-profile on `auth.users` insert, deferred one-owner-per-group invariant, immutable friendships pair, `updated_at` bumps.
- **Storage:** `avatars` bucket with owner-scoped write policies (public read).
- **Profile backfill:** all 8 prior users have `profiles` rows with auto-derived placeholder handles.

Frontend auth flow:

- **Sign-up** — email + password, password ≥ 8 chars (validated client AND server). Email confirmation is OFF in the dashboard, so signup auto-signs in.
- **Sign-in** — `signInWithPassword`. Inline error translation: "Invalid email or password" for bad creds, friendly rate-limit message, etc.
- **Sign-out** — button in Settings; `onAuthStateChange` fires `SIGNED_OUT` and `AuthGate` flips back to SignIn.
- **Forgot password** — three-step flow: enter email → "check your email" → click link → land on `/reset-password` → enter new password + confirm → app. URL path detection survives a refresh mid-flow.
- **First-sign-in handle picker (`Welcome.jsx`)** — auto-derived placeholder pre-filled, debounced availability check via `handle_available` RPC, atomic write via `claim_handle` (catches unique-violation as friendly error).
- **Edit handle later** — Settings → Edit Profile. Save routes through `claim_handle` first, then updates local state. Honors the "you can change it later" promise from Welcome.
- **8-second watchdog** in `AuthGate` — any infinite loading flips to an error screen with Retry instead of a white screen.
- **Singleton Supabase client** — `globalThis` cache in `src/lib/supabase.js` prevents Vite HMR from instantiating multiple `GoTrueClient` instances per tab.

Existing calendar app:

- **Untouched and fully functional behind the auth gate.** `<AuthGate><App /></AuthGate>` in `main.jsx`. App still uses `localStorage` for everything except handle save and sign-out.

---

## What's broken (auth)

Full detail in `NOTES.md`. Quick summary:

1. ~~**Duplicate `SIGNED_IN` events on subsequent loads** → watchdog hangs after 8s.~~ **Fixed.** Same-session-id dedup in `AuthGate.jsx`'s subscription handler ignores redundant `SIGNED_IN` / `INITIAL_SESSION` events for a user already loading or loaded. Resets on `SIGNED_OUT`.
2. ~~**Password reset returns 422.**~~ **Fixed.** Two underlying causes — both addressed:
   - The recovery email used `{{ .ConfirmationURL }}` (PKCE flow), but the PKCE code-verifier in localStorage didn't survive between request and click (cross-device, cleared storage), so `detectSessionInUrl` silently failed to create a session. `updateUser` then ran with no session and returned 422 ("auth session missing"), surfaced as a misleading "expired link." Switched the **Reset Password** email template to `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery` and added an explicit `verifyOtp({ token_hash, type: 'recovery' })` in `AuthGate.jsx` at module scope (StrictMode-safe — see comment block).
   - After `updatePassword` succeeded, `USER_UPDATED` fired and the listener's catch-all branch raced `ResetPassword.onDone` for the post-update transition; the listener's `loadProfile` hung on the same nav-lock contention. Collapsed `USER_UPDATED` into its own no-op branch (just `setSession`) — see fix to issue #4 below.
3. **Multi-tab navigator-lock race** when an email link opens in a new tab while another is live. Two `GoTrueClient`s on the same origin deadlock on the auth refresh lock. Singleton fix doesn't cover cross-tab — different JS contexts, different `globalThis`.
4. ~~**`USER_UPDATED` after a successful update triggers `loadProfile`**~~ **Fixed.** `USER_UPDATED` now has its own branch in the auth event handler — updates `session` and returns. The `profiles` row we render from doesn't reflect any `auth.users` columns, so refetching on `USER_UPDATED` was always wasted work. Bonus: removes the race with the recovery-flow `onDone`.
5. **Watchdog warning fires once at page load** when the user lands via the recovery link. Likely the `recoveryVerifyInFlightRef` hold-off keeps `status='loading'` long enough that the 8s watchdog briefly arms before `PASSWORD_RECOVERY` fires. Cosmetic — flow completes correctly. Investigate next session.
6. ~~**Stale `/reset-password` URL leaves AuthGate in a half-recovery state on reload.**~~ **Fixed.** Module-load guard in `AuthGate.jsx` redirects `/reset-password` → `/` whenever the URL is missing the `token_hash` + `type=recovery` pair. Trade-off: refreshing while on the post-verify password form also bumps to `/`; user is signed in at that point and can change password via Settings. Documented in code comment.
7. ~~**`loadProfile` hangs on plain reload while signed in.**~~ **Fixed (2026-04-29).** Root cause: GoTrueClient's default `navigatorLock` (Web Locks API) acquired the auth-token lock during session recovery on hard reload and never released it. The lock holder was the legitimate current client (not an orphan), so contention wasn't the issue — the locked critical section itself wedged. Subsequent PostgREST calls returned 200 at the network layer but their JS-level promises hung waiting on the lock. Fix: switched the client to `processLock` (in-memory promise chain) via `auth: { lock: processLock }` in `createClient`. processLock has no cross-page-lifecycle state, so hard reload starts clean. Trade-off: lose cross-tab serialization of token refreshes (already accepted under #3). Diagnosis driven by lock-state instrumentation captured in the prior commit and stripped in the follow-up.
8. **Hard reload (Cmd+Shift+R) wipes localStorage when signed out — status: to investigate.** Confirmed by user: pressing Cmd+Shift+R on a signed-out browser clears every `daytu_*` key (events, calendars, `onboardingComplete`, `userProfile`, etc.). The Supabase Auth session survives because that's server-side, so the user appears signed in but with a totally fresh client state. Plain Cmd+R does NOT clear localStorage — only the hard-reload variant. Per spec, Cmd+Shift+R is supposed to bypass the HTTP cache only; touching storage is anomalous. Investigation suspects, in order of likelihood: **(a)** a registered service worker doing storage cleanup on activate / `clients.claim()` — check `navigator.serviceWorker.getRegistrations()`; **(b)** an effect in the codebase that calls `localStorage.removeItem` / `.clear()` under a specific mount condition (only known call site today is the soft-reset path at `App.jsx:1067`, but that requires user interaction — search for any unconditional removal); **(c)** a Vite plugin or dev-server behavior tied to a forced rebuild. Effectively a soft-data-loss surface for unmigrated users — do not Cmd+Shift+R during events-migration testing until root cause is known.

9. **Edit Profile name doesn't push to Supabase.** `EditProfileSheet.handleSave` calls `claim_handle` RPC for handle changes but only updates local React state for name (and avatar) changes. Cross-device: a name rename on Device A is invisible to Device B and gets overwritten back to the server-stored name on next sign-in (since `App.jsx` now hydrates `userProfile.name` from `profiles.name` on every `loadProfile` resolution). Fix: add a `profiles` update for `name` alongside the handle path in `handleSave`.

Issues #3, #5, #8, and #9 remain open. Calendar app + auth core are fully usable.

---

## What hasn't been started

The backend supports a lot more than the UI currently exposes. Frontend is wired only for auth + handle picker.

**Data layer migration (foundational — blocks everything social):**
- `events`, `major_events`, `shifts` — still `localStorage`-only on the client. Need to swap reads to `events_for_viewer()` / etc., and writes to direct table inserts/updates with `owner_id = auth.uid()`.
- `userProfile` — Welcome screen writes the chosen handle to Supabase, but the existing localStorage `userProfile.handle` doesn't sync back. Settings will display the stale local value until the user opens Edit Profile and re-saves. Documented in code; needs a one-time sync on first sign-in.
- Calendars — currently a localStorage construct (`c1`, `c2`, etc.). Schema doesn't model them as a table; `events.calendar_id` is `uuid` with no FK. Decide: add a `calendars` table, or keep calendars as a per-user JSON config on `profiles`?

**Social UI (gated behind `FEATURES.*` flags in `src/App.jsx:21`, all currently `false`):**
- Friends — list, requests inbox, sent, accept/decline, search by `@handle` (calls `profiles` SELECT, RLS lets any authed user resolve handles). Existing dummy UI at `App.jsx:3785–3909`.
- Groups — create/edit/delete, member add/remove, role badges (Owner/Editor/Member pills), member-list privacy toggle. Existing dummy UI at `App.jsx:3702–3783` and create/edit sheet at `6666–6711`.
- Sharing pickers on events / major events / shifts — 4-level visibility (private/friends/groups/people). Existing dummy picker at `App.jsx:6431–6443` (3-level only — needs the 4th "people" option added).
- "Shared by" pills on calendar cards. Reader function payloads carry everything needed (`owner_name`, `owner_handle`, `share_path`, `share_group_id`, `share_group_name`). Render rule: own → no pill; friends/people → owner name; groups → "{owner} · {group}"; tap → profile or group.
- Activity feed — explicitly dropped per earlier design decision.

**Avatar uploads to Supabase Storage:**
- Bucket exists with correct policies. Edit Profile sheet currently writes a JPEG data URI to localStorage. Need to upload to `avatars/{auth.uid}/profile.jpg` instead and store the resulting URL in `profiles.avatar_url`.

**Account deletion flow:**
- Reminder in memory: must transfer or delete owned groups before calling `auth.admin.deleteUser()` or the deferred one-owner-per-group invariant blocks the delete at commit. No UI for account deletion yet.

**Cleanup / polish:**
- Console `[auth]` logs in `AuthGate.jsx` — diagnostic, remove before prod.
- Magic-link email template in Supabase dashboard — customized with `{{ .Token }}` from earlier OTP-code experiment. Unused now (we don't call `signInWithOtp`). Can revert to default any time.

---

## Branch state

```
* supabase-integration     ← you are here
  main                     ← Vercel prod, untouched
```

- Working tree at handoff: clean (after this HANDOFF.md commit lands).
- All commits on `supabase-integration` pushed to `origin/supabase-integration`.
- Range from `main`: `main..supabase-integration` covers the full social-layer migration + auth work.
- Two migration files under `supabase/migrations/` — both already **applied** to the linked Supabase project. Re-running on a fresh project: idempotent for the second migration (`if not exists`), idempotent enough for the first (will error on existing tables but in a recoverable way; check `NOTES.md` style for the pre-check query).

---

## Recommended order when picking this up

1. ~~**Fix duplicate `SIGNED_IN` (issue #1).**~~ **Done.** Same-session-id dedup landed in `AuthGate.jsx`.
2. ~~**Fix the `USER_UPDATED` loop (issue #4).**~~ **Done.** Split into its own no-op branch in `AuthGate.jsx` — updates `session` only.
3. ~~**Capture the 422 from password reset (issue #2).**~~ **Done.** Root cause was PKCE auto-detect on a token-hash flow + the `USER_UPDATED` race; switched the email template to `{{ .TokenHash }}`, added explicit `verifyOtp` at module scope, and split `USER_UPDATED`. End-to-end reset works.
4. **Investigate the page-load watchdog warning (issue #5).** Single `[auth] watchdog fired` at the moment of recovery-link landing. Cosmetic, doesn't block the flow. Likely fix: skip the watchdog while `recoveryVerifyInFlightRef.current` is true, or shorten the hold-off window.
5. **Decide on issue #3 (multi-tab nav lock).** Either build a coordinator (BroadcastChannel-based leader election) or accept it and document "use password sign-in for cross-device" in the UI.
6. ~~**Sync localStorage `userProfile` from Supabase profile on sign-in.**~~ **Done.** `AuthGate` passes the loaded `profile` row to `App` via `cloneElement`; an effect in `App.jsx` hydrates `userProfile.handle` and `userProfile.name` from server values on every `loadProfile` resolution. Avatar deferred to item #8 (Storage uploads). Local-only fields (defaultCalendar, defaultReminder, badges, email) are preserved.
7. **Data layer migration — events.** Step-by-step plan. Steps 1 and 2 done; 3 and 4 open.
   - ~~**Step 1: read swap.**~~ **Done.** `loadEventsFromSupabase()` via `events_for_viewer` RPC; localStorage fallback when remote is empty and the migrated flag is unset; inline "Syncing your events…" banner with timeout + Retry. (`6243016`)
   - ~~**Step 2: one-time migration.**~~ **Done.** On first signed-in mount, `migrateEventsIfNeeded` pushes localStorage events to Supabase, remaps `pinnedEvents` and `dismissedImportantEvents` to the new server UUIDs, and gates re-runs via `daytu_v1.events_migrated_to_supabase`. Crash-safe via persisted UUID remap (`events_pending_migration_remap`). Cross-device safe — if remote already has rows, we set the flag and skip migration.
   - ~~**Step 3: optimistic write rewires.**~~ **Done.** `addEvent` / `updateEvent` / `deleteEvent` / `duplicateEvent` apply state optimistically and fire Supabase mutations in the background; on error, state reverts and a toast surfaces the failure.
   - ~~**Step 4: cleanup.**~~ **Done.** Events are no longer written to the persist blob (Supabase is authoritative). Calendar-delete now persists the `calendarId` re-assignment via batch `updateEventRow`. `doSoftReset` / `doFullReset` call `deleteAllEventsForOwner` before clearing local state.
8. **Wire avatar uploads.** Easy win once data layer is started — migrate the Edit Profile cropper to upload to Storage instead of stuffing a data URI into localStorage.
9. **Flip social feature flags one at a time and wire each.** Suggested order: Groups (simplest, owner-managed) → Friends (slightly more complex, two-sided handshake) → Sharing pickers (depends on both) → Shared-by pills (depends on data being in Supabase).
10. **Account deletion handler.** Pre-flight transfer/delete of owned groups before `auth.admin.deleteUser()`. Reminder is in `~/.claude` memory.

---

## Environment quirks

- **Supabase Site URL** is currently `http://localhost:5173`. Must change to `https://daytu.app` before prod. Both URLs already in the redirect-URL allowlist (`/**`).
- **Email confirmation:** OFF for dev. Toggle ON before prod for security.
- **Minimum password length:** set to 8 server-side (matches client).
- **Email rate limits:** Supabase free tier defaults are aggressive — ~4 emails/hour per project for the built-in SMTP. Hit during magic-link experimentation. For prod or heavy testing, configure a real SMTP provider in Authentication → SMTP Settings.
- **Magic-link email template:** customized with `{{ .Token }}` from the deleted OTP-code path. Harmless (we no longer call `signInWithOtp`), but feel free to revert to default.
- **`.env.local` at repo root:** contains real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Gitignored via the existing `*.local` rule.
- **`[auth]` console logs** in `src/auth/AuthGate.jsx` are diagnostic — keep them while we still have unresolved auth bugs, remove before prod.
- **Persist effect spreads `...lsLoad()`** — the `daytu_v1` blob is reconstructed on a 300ms debounce from React state. Without spreading the live localStorage blob first, any field that lives in localStorage but not in React state (the migration flag, the pending UUID remap, future similar fields) gets clobbered every tick. The spread is now first in the lsSave object literal so React-state keys still override on top. Defensive — protects all future localStorage-only fields, not just the events migration ones.
- **Existing 8 users have no password.** First time each one signs in, they'll need to use "Forgot password?" to set one. This is documented in the auth flow and works correctly.
- **The DB owner-of-group invariant is deferred.** If a user is deleted from `auth.users` and they own groups, the cascade will fail at commit. No bug today (no account-deletion UI), but the future flow must transfer/delete groups first.
- **Vite HMR + Supabase singleton:** the `globalThis` cache in `src/lib/supabase.js` is essential — without it, every save in dev re-instantiates `GoTrueClient` and you'll hit the in-tab nav-lock contention. Don't refactor that file casually.
- **Event `groupIds` are not round-tripped to Supabase yet.** `eventToRow` intentionally drops them (sharing UI is out of scope for this milestone). Optimistic state retains `groupIds` after a write, but the next `loadEventsFromSupabase` will return them as `[]`. Wires up when sharing migrates.
