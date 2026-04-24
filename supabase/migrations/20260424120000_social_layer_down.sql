-- ============================================================================
-- daytu social layer — DOWN migration
--
-- Reverses 20260424120000_social_layer.sql. Destructive: will lose all data
-- in the new tables (profiles, friendships, groups, events, shifts, etc.)
-- AND every object stored in the `avatars` bucket. Run only for rollback.
--
-- Extensions (citext, pgcrypto) are intentionally NOT dropped — they may be
-- used elsewhere and are cheap to keep around.
-- ============================================================================

begin;

-- 1. Trigger on auth.users (outside our schema; not covered by table drops).
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Drop tables in reverse dependency order. CASCADE handles:
--    - FK constraints, indexes, triggers on these tables
--    - RLS policies attached to these tables
--    - Functions whose argument types reference these tables as composite
--      row types (i.e. can_see_event / can_see_major_event / can_see_shift).
drop table if exists public.shift_user_shares         cascade;
drop table if exists public.shift_group_shares        cascade;
drop table if exists public.shifts                    cascade;
drop table if exists public.major_event_user_shares   cascade;
drop table if exists public.major_event_group_shares  cascade;
drop table if exists public.major_events              cascade;
drop table if exists public.event_user_shares         cascade;
drop table if exists public.event_group_shares        cascade;
drop table if exists public.events                    cascade;
drop table if exists public.group_members             cascade;
drop table if exists public.groups                    cascade;
drop table if exists public.friendships               cascade;
drop table if exists public.profiles                  cascade;

-- 3. Remaining functions (not auto-dropped by table cascades above).
drop function if exists public.events_for_viewer();
drop function if exists public.major_events_for_viewer();
drop function if exists public.shifts_for_viewer();
drop function if exists public.send_friend_request(uuid);
drop function if exists public.accept_friend_request(uuid);
drop function if exists public.unfriend(uuid);
drop function if exists public.create_group(text, text);
drop function if exists public.transfer_group_ownership(uuid, uuid);
drop function if exists public.is_friend(uuid, uuid);
drop function if exists public.group_role(uuid, uuid);
drop function if exists public.is_group_member(uuid, uuid);
drop function if exists public.tg_set_updated_at()                         cascade;
drop function if exists public.tg_group_owner_invariant()                  cascade;
drop function if exists public.tg_friendships_requested_by_immutable()     cascade;
drop function if exists public.tg_profile_on_signup()                      cascade;

-- 4. Storage: clear objects, drop policies, remove bucket.
delete from storage.objects where bucket_id = 'avatars';
drop policy if exists "avatars public read"  on storage.objects;
drop policy if exists "avatars owner insert" on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner delete" on storage.objects;
delete from storage.buckets where id = 'avatars';

commit;
