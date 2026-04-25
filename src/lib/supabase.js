import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'
  );
}

// Vite HMR re-evaluates this module on file changes in dev. Without a global
// cache, each re-evaluation calls createClient() again, leaving two (or more)
// GoTrueClient instances alive in the same tab — they fight over the same
// localStorage auth lock and silently deadlock. Cache the instance on
// globalThis so HMR reuses the original client and never instantiates a
// second one. Has no effect in production builds (single evaluation).
export const supabase =
  globalThis.__daytuSupabase ??
  (globalThis.__daytuSupabase = createClient(url, anonKey));
