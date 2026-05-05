import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const FONT = "'DM Sans', sans-serif";

// Design tokens mirroring App.jsx's :root and .light-mode CSS. Welcome renders
// before App mounts, so App's CSS block isn't injected — we duplicate the
// relevant slice inline. Same pattern as SignIn / ResetPassword. DM Sans is
// loaded globally via src/index.css.
const TOKENS = {
  dark: {
    bg: '#111118',
    surface: '#1e1e2a',
    surface2: '#2a2a3a',
    border: 'rgba(255,255,255,0.13)',
    text: '#ffffff',
    muted: '#b4b4c8',
    accent: '#7c6af7',
    accent2: '#a78bfa',
    red: '#ef4444',
    cardShadow: '0 4px 24px rgba(0,0,0,0.32)',
    focusGlow: 'none',
    errorBg: 'rgba(239,68,68,0.12)',
    errorText: '#fca5a5',
    successText: '#10b981',
    eyeFill: '#ffffff',
  },
  light: {
    bg: '#e8e2f8',
    surface: '#f4f0ff',
    surface2: '#ebe5f8',
    border: 'rgba(60,40,140,0.15)',
    text: '#0d0b1e',
    muted: '#3d3860',
    accent: '#4530d8',
    accent2: '#3820b8',
    red: '#b01020',
    cardShadow: '0 4px 24px rgba(60,40,140,0.10)',
    focusGlow: '0 0 0 3px rgba(69,48,216,0.12)',
    errorBg: 'rgba(176,16,32,0.08)',
    errorText: '#991b1b',
    successText: '#0a6644',
    eyeFill: '#000000',
  },
};

// Read user's preferred theme from daytu_v1 in localStorage. Returns
// 'auto' | 'light' | 'dark'. Falls back to 'auto' on any read/parse failure.
function readStoredThemeMode() {
  try {
    if (typeof localStorage === 'undefined') return 'auto';
    const raw = localStorage.getItem('daytu_v1');
    if (!raw) return 'auto';
    const mode = JSON.parse(raw)?.themeMode;
    return mode === 'light' || mode === 'dark' ? mode : 'auto';
  } catch {
    return 'auto';
  }
}

function useThemeTokens() {
  const themeMode = useMemo(() => readStoredThemeMode(), []);
  const [dark, setDark] = useState(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return typeof window !== 'undefined'
      && !!window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    if (themeMode !== 'auto') return;
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [themeMode]);
  return dark ? TOKENS.dark : TOKENS.light;
}

// Inline CSS for pseudo-states (focus, hover, active) that inline style
// objects can't express, plus the error fade-in keyframe and the iOS-zoom
// font-size rule. Class names match SignIn / ResetPassword — the styles are
// shared auth-screen behavior, not specific to any one screen.
const signinCss = `
@keyframes signinErrorIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.signin-input {
  font-size: max(16px, 0.9375rem);
  transition: border-color .15s, box-shadow .15s;
}
.signin-input:focus { border-color: var(--signin-accent); box-shadow: var(--signin-focus-glow); }
.signin-input::placeholder { color: var(--signin-muted); }
.signin-input-wrap { transition: border-color .15s, box-shadow .15s; }
.signin-input-wrap:focus-within { border-color: var(--signin-accent); box-shadow: var(--signin-focus-glow); }
.signin-button { transition: opacity .15s, transform .08s; }
.signin-button:hover:not(:disabled) { opacity: 0.92; }
.signin-button:active:not(:disabled) { transform: scale(0.98); }
.signin-link { transition: opacity .12s; }
.signin-link:hover { text-decoration: underline; }
`;

function DaytuLogo({ size = 64, eyeFill }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width={size} height={size} aria-label="Daytu">
      <path d="M 620 40 L 860 40 A 100 100 0 0 1 960 140 L 960 860 A 100 100 0 0 1 860 960 L 140 960 A 100 100 0 0 1 40 860 L 40 140 A 100 100 0 0 1 140 40 L 380 40"
        fill="none" stroke="#5a3fbf" strokeWidth="40" strokeLinecap="butt" />
      <path d="M 610 120 L 780 120 A 90 90 0 0 1 870 210 L 870 790 A 90 90 0 0 1 780 880 L 220 880 A 90 90 0 0 1 130 790 L 130 210 A 90 90 0 0 1 220 120 L 390 120"
        fill="none" stroke="#6b4fd0" strokeWidth="40" strokeLinecap="butt" />
      <path d="M 600 200 L 700 200 A 80 80 0 0 1 780 280 L 780 720 A 80 80 0 0 1 700 800 L 300 800 A 80 80 0 0 1 220 720 L 220 280 A 80 80 0 0 1 300 200 L 400 200"
        fill="none" stroke="#b49cf0" strokeWidth="40" strokeLinecap="butt" />
      <rect x="390" y="370" width="24" height="240" rx="12" fill={eyeFill} />
      <rect x="586" y="370" width="24" height="240" rx="12" fill={eyeFill} />
    </svg>
  );
}

function buildStyles(t) {
  return {
    page: {
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: t.bg,
      padding: 24,
      fontFamily: FONT,
      color: t.text,
      '--signin-accent': t.accent,
      '--signin-focus-glow': t.focusGlow,
      '--signin-muted': t.muted,
    },
    logoWrap: { marginBottom: 24 },
    card: {
      width: '100%',
      maxWidth: 380,
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      padding: '28px 24px',
      boxShadow: t.cardShadow,
    },
    title: {
      margin: '0 0 6px',
      fontSize: '1.375rem',
      fontWeight: 600,
      letterSpacing: '-0.4px',
      color: t.text,
    },
    subtitle: {
      margin: '0 0 24px',
      fontSize: '0.875rem',
      color: t.muted,
      lineHeight: 1.5,
    },
    label: {
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: 600,
      color: t.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
      marginBottom: 6,
    },
    inputWrap: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      background: t.surface2,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      overflow: 'hidden',
    },
    inputPrefix: {
      padding: '0 4px 0 13px',
      color: t.muted,
      fontSize: 'max(16px, 0.9375rem)',
      userSelect: 'none',
      fontFamily: FONT,
    },
    input: {
      flex: 1,
      background: 'transparent',
      border: 'none',
      padding: '11px 13px 11px 4px',
      color: t.text,
      fontFamily: FONT,
      fontSize: 'max(16px, 0.9375rem)',
      outline: 'none',
      minWidth: 0,
    },
    status: {
      marginTop: 8,
      fontSize: '0.75rem',
      lineHeight: 1.4,
      minHeight: 18,
    },
    error: {
      marginTop: 12,
      padding: '10px 12px 10px 14px',
      background: t.errorBg,
      borderLeft: `3px solid ${t.red}`,
      borderRadius: '0 6px 6px 0',
      color: t.errorText,
      fontSize: '0.8125rem',
      lineHeight: 1.4,
      animation: 'signinErrorIn .18s ease-out',
    },
    button: {
      width: '100%',
      background: t.accent,
      color: '#ffffff',
      padding: '12px 20px',
      fontSize: '0.9375rem',
      fontWeight: 500,
      border: 'none',
      borderRadius: 12,
      cursor: 'pointer',
      marginTop: 18,
      fontFamily: FONT,
    },
    buttonDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  };
}

function sanitize(input) {
  return input
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export default function Welcome({ initialHandle = '', onDone }) {
  const t = useThemeTokens();
  const styles = buildStyles(t);

  const [handle, setHandle] = useState(initialHandle);
  // availability: 'idle' | 'invalid' | 'checking' | 'available' | 'taken'
  const [availability, setAvailability] = useState(
    HANDLE_RE.test(initialHandle) ? 'available' : 'idle',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Availability check: debounced, cancellable.
  useEffect(() => {
    // Own current handle counts as available (the RPC agrees, but skip the roundtrip).
    if (handle === initialHandle && HANDLE_RE.test(handle)) {
      setAvailability('available');
      return;
    }
    if (!handle) {
      setAvailability('idle');
      return;
    }
    if (!HANDLE_RE.test(handle)) {
      setAvailability('invalid');
      return;
    }

    setAvailability('checking');
    let cancelled = false;
    debounceRef.current = setTimeout(async () => {
      const { data, error: rpcError } = await supabase.rpc('handle_available', {
        p_handle: handle,
      });
      if (cancelled) return;
      if (rpcError) {
        setAvailability('idle');
        setError(rpcError.message);
      } else {
        setAvailability(data ? 'available' : 'taken');
      }
    }, 300);

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [handle, initialHandle]);

  function handleChange(e) {
    setHandle(sanitize(e.target.value));
    setError(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (availability !== 'available' || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: claimError } = await supabase.rpc('claim_handle', {
      p_handle: handle,
    });
    if (claimError) {
      const msg = claimError.message || 'Could not save handle. Try again.';
      setError(msg);
      setSubmitting(false);
      if (/taken/i.test(msg)) setAvailability('taken');
      return;
    }
    onDone?.();
  }

  const statusColor =
    availability === 'available' ? t.successText :
    availability === 'invalid' || availability === 'taken' ? t.red :
    t.muted;

  const statusText = {
    idle:      '3–20 characters: letters, numbers, underscores',
    invalid:   'Use letters, numbers, or underscores only (3–20 chars)',
    checking:  'Checking availability…',
    available: '✓ Available',
    taken:     'Taken — try another',
  }[availability];

  const submitDisabled = availability !== 'available' || submitting;

  return (
    <div style={styles.page}>
      <style>{signinCss}</style>
      <div style={styles.logoWrap}>
        <DaytuLogo size={64} eyeFill={t.eyeFill} />
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>Pick a username</h1>
        <p style={styles.subtitle}>
          This is how friends find you on daytu. You can change it later.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="welcome-handle" style={styles.label}>Username</label>
          <div className="signin-input-wrap" style={styles.inputWrap}>
            <span style={styles.inputPrefix}>@</span>
            <input
              id="welcome-handle"
              type="text"
              value={handle}
              onChange={handleChange}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={submitting}
              style={styles.input}
            />
          </div>
          <div style={{ ...styles.status, color: statusColor }}>{statusText}</div>
          {error && <div style={styles.error}>{error}</div>}
          <button
            type="submit"
            disabled={submitDisabled}
            className="signin-button"
            style={{
              ...styles.button,
              ...(submitDisabled ? styles.buttonDisabled : {}),
            }}
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
