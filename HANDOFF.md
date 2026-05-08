# HANDOFF — Supabase integration

Status snapshot for picking this back up after time away. Branch is feature-complete; remaining work is pre-merge polish.

**Branch:** `supabase-integration` (not `main`).
**Last commit at handoff:** `3a2d0a9` — "style(auth): align Welcome and ResetPassword with SignIn design language."
**Production:** Vercel deploys from `main`, so `daytu.app` is not affected by this branch.

---

## What's working end-to-end

Backend (Supabase, all migrations applied):

- **Schema:** `profiles`, `friendships`, `groups` + `group_members` (with owner/editor/member roles and member-list privacy toggle), `events` / `major_events` / `shifts` and their `*_group_shares` / `*_user_shares` target tables. RLS on every table, scoped by `is_friend()` + `can_see_*()` predicates so unfriending revokes visibility at query time without touching share rows.
- **Reader functions:** `events_for_viewer()`, `major_events_for_viewer()`, `shifts_for_viewer()` — return rows the caller can see plus `share_path`, `share_group_id`, `share_group_name`, `owner_name`, `owner_handle` for the "shared by" pill UI.
- **RPCs:** `send_friend_request`, `accept_friend_request`, `unfriend`, `create_group`, `transfer_group_ownership`, `leave_group`, `delete_my_account`, `handle_available`, `claim_handle`.
- **Triggers:** auto-profile on `auth.users` insert, deferred one-owner-per-group invariant, immutable friendships pair, `updated_at` bumps.
- **Storage:** `avatars` bucket with owner-scoped write policies (public read).
- **Profile backfill:** all 8 prior users have `profiles` rows with auto-derived placeholder handles.

Frontend:

- **Sign-up** — email + password, password ≥ 8 chars (validated client AND server). Email confirmation is OFF in the dashboard, so signup auto-signs in.
- **Sign-in** — `signInWithPassword`. Inline error translation: "Invalid email or password" for bad creds, friendly rate-limit message, etc.
- **Sign-out** — button in Settings; `onAuthStateChange` fires `SIGNED_OUT` and `AuthGate` flips back to SignIn.
- **Forgot password** — three-step flow: enter email → "check your email" → click link → land on `/reset-password` → enter new password + confirm → app. URL path detection survives a refresh mid-flow.
- **First-sign-in handle picker (`Welcome.jsx`)** — auto-derived placeholder pre-filled, debounced availability check via `handle_available` RPC, atomic write via `claim_handle` (catches unique-violation as friendly error).
- **Edit handle later** — Settings → Edit Profile. Save routes through `claim_handle` first, then updates local state. Honors the "you can change it later" promise from Welcome.
- **8-second watchdog** in `AuthGate` — any infinite loading flips to an error screen with Retry instead of a white screen.
- **Singleton Supabase client** — `globalThis` cache in `src/lib/supabase.js` prevents Vite HMR from instantiating multiple `GoTrueClient` instances per tab.
- **Profile editing** — `EditProfileSheet` pushes name via `profiles.update` and handle via `claim_handle`. Hydrate effect in `App.jsx` syncs `userProfile.handle`/`name`/`avatar` from server values on every `loadProfile` resolution.
- **Avatar upload** — cropper output uploaded to `avatars/{userId}/profile.jpg` (upsert) and `profiles.avatar_url` stores the public URL with `?v=<timestamp>` cache-buster.
- **Events** — Supabase is authoritative. Reads via `events_for_viewer`, optimistic writes (`addEvent`/`updateEvent`/`deleteEvent`/`duplicateEvent`) with revert-on-error toasts. One-time localStorage migration runs on first signed-in mount, with crash-safe UUID remap gated by the `daytu_v1.events_migrated_to_supabase` flag.
- **Groups** — full UI behind the now-on `FEATURES.groups` flag. Create/edit sheets, owner-aware controls, handle-based member-add, transfer-ownership and leave-group flows, role-pill polish on list cards.
- **Friends** — list, requests inbox/sent, accept/decline, handle search via `profiles` SELECT (RLS lets any authed user resolve handles). Optimistic Supabase writes for all mutations. Behind the now-on `FEATURES.friends` flag.
- **Sharing** — 4-level visibility picker (private/friends/groups/people) on events. Share targets round-trip via `loadShareTargetsForOwnedEvents` (read) and `diffAndWriteShares` (write). "Shared by" pill payload (`owner_name`, `owner_handle`, `share_path`, `share_group_name`) carried inline by `events_for_viewer`. Behind the now-on `FEATURES.sharing` flag.
- **Account deletion** — Settings → Danger Zone. `loadDeletionPreflight` surfaces any owned groups before the destructive call; `delete_my_account` RPC executes the atomic cascade (storage avatars + `auth.users` delete → cascades through every public-schema FK).
- **Calendars (legacy localStorage).** The user's calendars (`c1`, `c2`, …) are not in the schema yet. `events.calendar_id` is reserved as `uuid` with no FK; events round-trip the local string id through `client_extras.calendarId`.

---

## What's still open

**Data layer (secondary):**
- **`major_events` and `shifts`.** Reader functions and share-target tables exist server-side; the client hasn't migrated. Both still write/read `localStorage` exclusively (no `src/lib/major_events.js` or `src/lib/shifts.js` yet). Mirror the four-step events plan: read swap → one-time migration → optimistic writes → cleanup.
- **Calendars table.** The user's calendars (`c1`, `c2`, …) are not in the schema. `events.calendar_id` is reserved as `uuid` with no FK; the interim is `client_extras.calendarId` carrying the local string id. Implicit direction (per `src/lib/events.js:13–19`) is to add a `calendars` table and backfill `events.calendar_id`, then drop the extras read.

**Frontend:**
- **Shared-by pills on event cards.** Payload is round-tripped to the client (`_ownerName` / `_sharePath` / `_shareGroupName` set in `rowToEvent` at `events.js:105–109`), but no consumer renders them. Render rule: own → no pill; friends/people → owner name; groups → "{owner} · {group}"; tap → profile or group.

**Pre-merge polish:**
- **Flip email confirmation ON** in the Supabase dashboard. Currently OFF for dev convenience.
- **Remove `[auth]` console logs** in `src/auth/AuthGate.jsx` — diagnostic, not for prod.
- **Magic-link email template** is customized with `{{ .Token }}` from a deleted OTP-code path. Harmless (we don't call `signInWithOtp`); revert to default any time.

### Pre-merge checklist

When ready to merge `supabase-integration` → `main`. Note: there's one Supabase project (`rwioojyvnzatobueuzqr`) serving both dev and prod, so backend migrations are already live — only client code + dashboard settings need attention pre-merge.

1. Flip email confirmation ON in Supabase.
2. Remove `[auth]` console logs in `AuthGate.jsx`.
3. (Optional) Revert magic-link email template to default.
4. Decide whether `major_events`/`shifts` migration ships before or after the merge. Both work in localStorage form, so deferring is a no-op for the merge itself.

---

## Branch state

```
* supabase-integration     ← you are here
  main                     ← Vercel prod, untouched
```

- Working tree at handoff: clean (after this HANDOFF.md commit lands).
- All commits on `supabase-integration` pushed to `origin/supabase-integration`.
- Range from `main`: `main..supabase-integration` covers the full social-layer migration + auth work.
- Six forward migrations under `supabase/migrations/` (each with a corresponding `_down.sql`), all applied to the linked Supabase project (`rwioojyvnzatobueuzqr`).

---

## Environment quirks

- **Supabase Site URL** is `https://daytu.app`. `http://localhost:5173` remains in the redirect-URL allowlist for dev.
- **Email confirmation:** OFF for dev. Toggle ON before prod for security.
- **Minimum password length:** set to 8 server-side (matches client).
- **Email rate limits:** Supabase free tier defaults are aggressive — ~4 emails/hour per project for the built-in SMTP. Hit during magic-link experimentation. For prod or heavy testing, configure a real SMTP provider in Authentication → SMTP Settings.
- **`.env.local` at repo root:** contains real `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Gitignored via the existing `*.local` rule.
- **Persist effect spreads `...lsLoad()`** — the `daytu_v1` blob is reconstructed on a 300ms debounce from React state. Without spreading the live localStorage blob first, any field that lives in localStorage but not in React state (the migration flag, the pending UUID remap, future similar fields) gets clobbered every tick. The spread is now first in the lsSave object literal so React-state keys still override on top. Defensive — protects all future localStorage-only fields, not just the events migration ones.
- **Existing 8 users have no password.** First time each one signs in, they'll need to use "Forgot password?" to set one. This is documented in the auth flow and works correctly.
- **The DB owner-of-group invariant is deferred.** If a user is deleted from `auth.users` while owning groups, the cascade fails at commit. The `delete_my_account` RPC handles this with a pre-flight refusal that asks the caller to transfer or delete owned groups first; `loadDeletionPreflight` surfaces the same check in the Settings UI before the destructive call.
- **Vite HMR + Supabase singleton:** the `globalThis` cache in `src/lib/supabase.js` is essential — without it, every save in dev re-instantiates `GoTrueClient` and you'll hit the in-tab nav-lock contention. Don't refactor that file casually.
