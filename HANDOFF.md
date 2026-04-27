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
2. **Password reset returns 422** intermittently. Not yet reproducible on demand.
3. **Multi-tab navigator-lock race** when an email link opens in a new tab while another is live. Two `GoTrueClient`s on the same origin deadlock on the auth refresh lock. Singleton fix doesn't cover cross-tab — different JS contexts, different `globalThis`.
4. **`USER_UPDATED` after a failed update triggers `loadProfile`** because `AuthGate`'s catch-all branch lumps it with `SIGNED_IN` / `INITIAL_SESSION`. Combined with #1 this can loop.

All four have workarounds. Calendar app + new auth core are usable today; the bugs surface in specific edge sequences.

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
2. **Fix the `USER_UPDATED` loop (issue #4).** Split it out of the catch-all branch — at most update `session`, leave `profile` and `status` alone. ~30 min.
3. **Capture the 422 from password reset (issue #2).** Add a one-time logger to print the response body next time it fires; once we see what's rejected, the fix is small.
4. **Decide on issue #3 (multi-tab nav lock).** Either build a coordinator (BroadcastChannel-based leader election) or accept it and document "use password sign-in for cross-device" in the UI.
5. **Sync localStorage `userProfile` from Supabase profile on sign-in.** Prevents the stale-handle display in Settings. Small — one effect in `App.jsx`, or pass profile from `AuthGate` as a prop.
6. **Begin the data layer migration.** Start with events (largest, most-used). Pattern: replace `events` array reads with `supabase.rpc('events_for_viewer')`, replace writes with `supabase.from('events').insert/update`. Keep localStorage as a write-through cache during the transition if you want, or cut over fully.
7. **Wire avatar uploads.** Easy win once data layer is started — migrate the Edit Profile cropper to upload to Storage instead of stuffing a data URI into localStorage.
8. **Flip social feature flags one at a time and wire each.** Suggested order: Groups (simplest, owner-managed) → Friends (slightly more complex, two-sided handshake) → Sharing pickers (depends on both) → Shared-by pills (depends on data being in Supabase).
9. **Account deletion handler.** Pre-flight transfer/delete of owned groups before `auth.admin.deleteUser()`. Reminder is in `~/.claude` memory.

---

## Environment quirks

- **Supabase Site URL** is currently `http://localhost:5173`. Must change to `https://daytu.app` before prod. Both URLs already in the redirect-URL allowlist (`/**`).
- **Email confirmation:** OFF for dev. Toggle ON before prod for security.
- **Minimum password length:** set to 8 server-side (matches client).
- **Email rate limits:** Supabase free tier defaults are aggressive — ~4 emails/hour per project for the built-in SMTP. Hit during magic-link experimentation. For prod or heavy testing, configure a real SMTP provider in Authentication → SMTP Settings.
- **Magic-link email template:** customized with `{{ .Token }}` from the deleted OTP-code path. Harmless (we no longer call `signInWithOtp`), but feel free to revert to default.
- **`.env.local` at repo root:** contains real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Gitignored via the existing `*.local` rule.
- **`[auth]` console logs** in `src/auth/AuthGate.jsx` are diagnostic — keep them while we still have unresolved auth bugs, remove before prod.
- **Existing 8 users have no password.** First time each one signs in, they'll need to use "Forgot password?" to set one. This is documented in the auth flow and works correctly.
- **The DB owner-of-group invariant is deferred.** If a user is deleted from `auth.users` and they own groups, the cascade will fail at commit. No bug today (no account-deletion UI), but the future flow must transfer/delete groups first.
- **Vite HMR + Supabase singleton:** the `globalThis` cache in `src/lib/supabase.js` is essential — without it, every save in dev re-instantiates `GoTrueClient` and you'll hit the in-tab nav-lock contention. Don't refactor that file casually.
