import { useEffect, useMemo, useState } from 'react';
import { updatePassword } from '../lib/auth.js';

const PASSWORD_MIN = 8;
const FONT = "'DM Sans', sans-serif";

// Design tokens mirroring App.jsx's :root and .light-mode CSS. ResetPassword
// renders before App mounts, so App's CSS block isn't injected — we duplicate
// the relevant slice inline. Same pattern as SignIn / Welcome. DM Sans is
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
// font-size rule. Class names match SignIn / Welcome — the styles are
// shared auth-screen behavior, not specific to any one screen. The
// signin-input-wrap rule is unused here (this screen has standalone
// inputs) but kept for parity across the auth-CSS surface.
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
    input: {
      width: '100%',
      background: t.surface2,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: '11px 13px',
      color: t.text,
      fontFamily: FONT,
      outline: 'none',
      boxSizing: 'border-box',
    },
    fieldGroup: { marginTop: 14 },
    hint: {
      marginTop: 6,
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

function friendlyError(msg) {
  if (!msg) return 'Could not update password. Try again.';
  if (/password should be at least/i.test(msg)) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (/new password should be different|same password/i.test(msg)) return 'New password must be different from your previous one.';
  if (/auth session missing|invalid|expired/i.test(msg)) return 'This reset link has expired. Request a new one from the sign-in screen.';
  if (/rate limit|too many requests|\b429\b/i.test(msg)) return 'Too many requests — please wait a minute and try again.';
  return msg;
}

export default function ResetPassword({ onDone }) {
  const t = useThemeTokens();
  const styles = buildStyles(t);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const tooShort = password.length > 0 && password.length < PASSWORD_MIN;
  const longEnough = password.length >= PASSWORD_MIN;
  const mismatched = confirm.length > 0 && confirm !== password;
  const matches = confirm.length > 0 && confirm === password && longEnough;
  const submitDisabled = submitting || !longEnough || password !== confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitDisabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: err } = await updatePassword(password);
      if (err) {
        setError(friendlyError(err.message));
        setSubmitting(false);
        return;
      }
      // Defensive: clear submitting before onDone in case parent doesn't
      // synchronously unmount us. Without this, a slow auth-state propagation
      // could leave the button stuck on "Updating…".
      setSubmitting(false);
      onDone?.();
    } catch (err) {
      setError(friendlyError(err?.message));
      setSubmitting(false);
    }
  }

  const passwordHintColor =
    tooShort ? t.red :
    longEnough ? t.successText :
    t.muted;

  const passwordHintText =
    password.length === 0
      ? `Must be at least ${PASSWORD_MIN} characters`
      : tooShort
      ? `Password must be at least ${PASSWORD_MIN} characters`
      : '✓ Looks good';

  const matchHintColor =
    mismatched ? t.red :
    matches ? t.successText :
    t.muted;

  const matchHintText =
    mismatched ? "Passwords don't match" :
    matches ? '✓ Matches' :
    '';

  return (
    <div style={styles.page}>
      <style>{signinCss}</style>
      <div style={styles.logoWrap}>
        <DaytuLogo size={64} eyeFill={t.eyeFill} />
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>Set a new password</h1>
        <p style={styles.subtitle}>
          You're almost done. Pick a password and confirm it below.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="reset-password" style={styles.label}>New password</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
            autoComplete="new-password"
            placeholder={`At least ${PASSWORD_MIN} characters`}
            disabled={submitting}
            className="signin-input"
            style={styles.input}
          />
          <div style={{ ...styles.hint, color: passwordHintColor }}>
            {passwordHintText}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="reset-confirm" style={styles.label}>Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting}
              className="signin-input"
              style={styles.input}
            />
            {confirm.length > 0 && (
              <div style={{ ...styles.hint, color: matchHintColor }}>
                {matchHintText}
              </div>
            )}
          </div>

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
            {submitting ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
