import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { getSession, subscribeToAuth } from '../lib/auth.js';
import SignIn from './SignIn.jsx';
import Welcome from './Welcome.jsx';
import ResetPassword from './ResetPassword.jsx';

// Parsed once at module load so a StrictMode double-mount can't lose the error.
const INITIAL_URL_ERROR = parseUrlError();
// Captured at module load: if a refresh happens on /reset-password,
// PASSWORD_RECOVERY won't re-fire (it's a one-shot event on link click), so
// the URL path is the durable signal that the user is in a reset flow.
const INITIAL_RECOVERY_PATH =
  typeof window !== 'undefined' &&
  window.location.pathname === '/reset-password';

function parseUrlError() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash;
  if (!hash.startsWith('#')) return null;
  const params = new URLSearchParams(hash.slice(1));
  if (params.get('access_token')) return null; // don't clobber a successful token hash
  const errorCode = params.get('error_code');
  const errorDesc = params.get('error_description');
  if (!errorCode && !errorDesc) return null;
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search,
  );
  if (errorCode === 'otp_expired') {
    return 'That sign-in link expired. Request a new one below.';
  }
  if (errorDesc) return errorDesc.replace(/\+/g, ' ');
  return "That sign-in link didn't work. Request a new one below.";
}

async function fetchProfile(userId) {
  return supabase
    .from('profiles')
    .select('id, handle, name, avatar_url, handle_is_placeholder')
    .eq('id', userId)
    .maybeSingle();
}

export default function AuthGate({ children }) {
  // 'loading' | 'unauthed' | 'welcome' | 'app' | 'error'
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(INITIAL_RECOVERY_PATH);
  // Dedup guard for SIGNED_IN / INITIAL_SESSION. StrictMode briefly runs two
  // subscriptions during the dev double-mount, and supabase emits an INITIAL
  // event per subscription plus SIGNED_IN as the stored session refreshes —
  // so the same user can fire the catch-all branch twice and overlap two
  // loadProfile calls. Tracking the user we've started/finished loading lets
  // us ignore the redundant event without affecting the legitimate ones.
  const loadStateRef = useRef({ userId: null, phase: 'idle' });

  const loadProfile = useCallback(async (currentSession) => {
    if (!currentSession) return;
    setFetchError(null);
    console.log('[auth] loadProfile start', currentSession.user.id);
    let { data, error } = await fetchProfile(currentSession.user.id);
    // Insert trigger should have created the row already; retry once in case
    // of a rare ordering hiccup.
    if (!error && !data) {
      await new Promise((r) => setTimeout(r, 800));
      ({ data, error } = await fetchProfile(currentSession.user.id));
    }
    if (error || !data) {
      console.warn('[auth] loadProfile error', error?.message);
      setFetchError(error?.message || 'Profile not found after sign-in.');
      setStatus('error');
      return;
    }
    const next = data.handle_is_placeholder ? 'welcome' : 'app';
    console.log('[auth] loadProfile done →', next);
    setProfile(data);
    setStatus(next);
  }, []);

  useEffect(() => {
    // A single subscription handles INITIAL_SESSION (fires on mount with
    // restored session or null), SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED.
    const unsub = subscribeToAuth(async (event, newSession) => {
      console.log('[auth] event:', event, 'has session:', !!newSession);
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        return;
      }
      if (event === 'PASSWORD_RECOVERY') {
        setSession(newSession);
        setRecoveryMode(true);
        return;
      }
      if (event === 'SIGNED_OUT' || !newSession) {
        loadStateRef.current = { userId: null, phase: 'idle' };
        setSession(null);
        setProfile(null);
        setStatus('unauthed');
        setRecoveryMode(false);
        return;
      }
      // INITIAL_SESSION (with session), SIGNED_IN, USER_UPDATED
      const userId = newSession.user.id;
      const dedupable = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
      if (
        dedupable &&
        loadStateRef.current.userId === userId &&
        loadStateRef.current.phase !== 'idle'
      ) {
        console.log('[auth] dedup', event, 'for', userId);
        setSession(newSession);
        return;
      }
      loadStateRef.current = { userId, phase: 'loading' };
      setSession(newSession);
      setStatus('loading');
      await loadProfile(newSession);
      // Mark loaded regardless of success/failure: Retry has its own path.
      if (loadStateRef.current.userId === userId) {
        loadStateRef.current.phase = 'loaded';
      }
    });
    return unsub;
  }, [loadProfile]);

  // Watchdog: if we sit in 'loading' for 8s, flip to error so the user
  // can recover. Covers any case where INITIAL_SESSION never fires or a
  // profile fetch stalls (stale token, cross-tab lock, network hang).
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      console.warn('[auth] watchdog fired — stuck in loading for 8s');
      setFetchError('Sign-in is taking longer than expected. Tap Retry to try again.');
      setStatus('error');
    }, 8000);
    return () => clearTimeout(timer);
  }, [status]);

  // Recovery takes precedence over every other render branch as long as the
  // user has a session — PASSWORD_RECOVERY sessions look like normal sessions
  // after the event fires, so we rely on this flag (set either by URL path
  // at mount or by the PASSWORD_RECOVERY event) to keep them on the reset
  // form until they finish updating the password.
  if (recoveryMode && session) {
    return (
      <ResetPassword
        onDone={async () => {
          if (window.location.pathname === '/reset-password') {
            window.history.replaceState(null, '', '/');
          }
          setRecoveryMode(false);
          setStatus('loading');
          await loadProfile(session);
        }}
      />
    );
  }
  if (status === 'loading') {
    return <Splash />;
  }
  if (status === 'error') {
    return (
      <ErrorScreen
        message={fetchError}
        onRetry={async () => {
          setFetchError(null);
          setStatus('loading');
          const fresh = await getSession();
          if (!fresh) {
            setStatus('unauthed');
            return;
          }
          setSession(fresh);
          await loadProfile(fresh);
        }}
      />
    );
  }
  if (status === 'unauthed') {
    return <SignIn initialError={INITIAL_URL_ERROR} />;
  }
  if (status === 'welcome') {
    return (
      <Welcome
        initialHandle={profile?.handle || ''}
        onDone={async () => {
          setStatus('loading');
          await loadProfile(session);
        }}
      />
    );
  }
  return children;
}

const splashStyle = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f5f5f7',
  color: '#6b7280',
  fontSize: 14,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
};

function Splash() {
  return <div style={splashStyle}>Loading…</div>;
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div
      style={{
        ...splashStyle,
        alignItems: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: '32px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          color: '#111',
        }}
      >
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
          Something went wrong
        </h1>
        <p
          style={{
            margin: '0 0 20px',
            fontSize: 14,
            color: '#6b7280',
            lineHeight: 1.5,
          }}
        >
          {message || "We couldn't load your profile. Please try again."}
        </p>
        <button
          onClick={onRetry}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 15,
            fontWeight: 500,
            color: '#fff',
            background: '#111',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}
