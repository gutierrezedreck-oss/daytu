import { useEffect, useMemo, useState } from 'react';
import { signUp, signIn, sendPasswordReset } from '../lib/auth.js';

const PASSWORD_MIN = 8;
const FONT = "'DM Sans', sans-serif";

// Design tokens mirroring App.jsx's :root and .light-mode CSS. SignIn renders
// before App mounts, so App's CSS block isn't injected — we duplicate the
// relevant slice inline. DM Sans is loaded globally via src/index.css.
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
// font-size rule (matching App.jsx's global input rule). Theme-dependent
// values flow through CSS custom properties on the page wrapper.
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
    subtitle: { margin: '0 0 24px', fontSize: '0.875rem', color: t.muted },
    labelRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: 6,
    },
    label: {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: t.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.6px',
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
    },
    fieldGroup: { marginTop: 14 },
    inlineLink: {
      background: 'transparent',
      border: 'none',
      color: t.accent2,
      fontSize: '0.75rem',
      fontWeight: 500,
      cursor: 'pointer',
      padding: 0,
      fontFamily: FONT,
    },
    passwordHint: { marginTop: 6, fontSize: '0.75rem', lineHeight: 1.4 },
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
    bottomLinks: {
      marginTop: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 8,
    },
    linkButton: {
      background: 'transparent',
      border: 'none',
      color: t.accent2,
      fontSize: '0.875rem',
      fontWeight: 500,
      cursor: 'pointer',
      padding: 0,
      textAlign: 'left',
      fontFamily: FONT,
    },
    sentBody: {
      margin: '0 0 6px',
      fontSize: '0.875rem',
      color: t.muted,
      lineHeight: 1.5,
    },
  };
}

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Try again.';
  if (/invalid login credentials/i.test(msg)) return 'Invalid email or password.';
  if (/user already registered/i.test(msg)) return 'That email is already in use. Try signing in instead.';
  if (/rate limit|too many requests|\b429\b/i.test(msg)) return 'Too many requests — please wait a minute and try again.';
  if (/email not confirmed/i.test(msg)) return 'Please verify your email before signing in.';
  if (/password should be at least/i.test(msg)) return `Password must be at least ${PASSWORD_MIN} characters.`;
  return msg;
}

const TITLES = {
  signin: 'Sign in to daytu',
  signup: 'Create your daytu account',
  reset:  'Reset your password',
};
const SUBTITLES = {
  signin: 'Enter your email and password.',
  signup: 'Pick a password to get started.',
  reset:  "We'll email you a link to set a new password.",
};

export default function SignIn({ initialError = null }) {
  const t = useThemeTokens();
  const styles = buildStyles(t);

  const [mode, setMode] = useState('signin');         // 'signin' | 'signup' | 'reset'
  const [status, setStatus] = useState('idle');       // 'idle' | 'submitting' | 'signup-sent' | 'reset-sent'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError);

  function switchMode(next) {
    setMode(next);
    setPassword('');
    setError(null);
    setStatus('idle');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    if (mode === 'signin' && !password) return;
    if (mode === 'signup' && password.length < PASSWORD_MIN) return;

    setStatus('submitting');
    setError(null);

    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(trimmedEmail, password);
        if (err) {
          setError(friendlyError(err.message));
          setStatus('idle');
          return;
        }
        // Success: AuthGate's onAuthStateChange handler will pick it up and
        // unmount us. Stay in 'submitting' until that happens.
      } else if (mode === 'signup') {
        const { data, error: err } = await signUp(trimmedEmail, password);
        if (err) {
          setError(friendlyError(err.message));
          setStatus('idle');
          return;
        }
        if (data?.session) {
          // Confirmation OFF: auto-signed-in. AuthGate takes over.
          return;
        }
        setStatus('signup-sent');
      } else {
        const { error: err } = await sendPasswordReset(trimmedEmail);
        if (err) {
          setError(friendlyError(err.message));
          setStatus('idle');
          return;
        }
        setStatus('reset-sent');
      }
    } catch (err) {
      setError(friendlyError(err?.message));
      setStatus('idle');
    }
  }

  if (status === 'signup-sent') {
    return (
      <ConfirmationCard
        title="Check your email"
        body={[
          <>We sent a verification link to <strong>{email}</strong>.</>,
          'Click the link to verify your account, then come back here to sign in.',
        ]}
        onBack={() => switchMode('signin')}
        styles={styles}
        eyeFill={t.eyeFill}
      />
    );
  }
  if (status === 'reset-sent') {
    return (
      <ConfirmationCard
        title="Check your email"
        body={[
          <>If <strong>{email}</strong> is registered, a password reset link is on its way.</>,
          'Click the link to set a new password.',
        ]}
        onBack={() => switchMode('signin')}
        styles={styles}
        eyeFill={t.eyeFill}
      />
    );
  }

  const submitting = status === 'submitting';
  const passwordTooShort =
    mode === 'signup' && password.length > 0 && password.length < PASSWORD_MIN;
  const submitDisabled =
    submitting ||
    !email.trim() ||
    (mode === 'signin' && !password) ||
    (mode === 'signup' && password.length < PASSWORD_MIN);
  const buttonLabel =
    submitting
      ? mode === 'signin' ? 'Signing in…'
      : mode === 'signup' ? 'Creating account…'
      : 'Sending…'
      : mode === 'signin' ? 'Sign in'
      : mode === 'signup' ? 'Create account'
      : 'Send reset link';

  return (
    <div style={styles.page}>
      <style>{signinCss}</style>
      <div style={styles.logoWrap}>
        <DaytuLogo size={64} eyeFill={t.eyeFill} />
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>{TITLES[mode]}</h1>
        <p style={styles.subtitle}>{SUBTITLES[mode]}</p>
        <form onSubmit={handleSubmit}>
          <div style={styles.labelRow}>
            <label htmlFor="signin-email" style={styles.label}>Email</label>
          </div>
          <input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            disabled={submitting}
            className="signin-input"
            style={styles.input}
          />

          {mode !== 'reset' && (
            <div style={styles.fieldGroup}>
              <div style={styles.labelRow}>
                <label htmlFor="signin-password" style={styles.label}>Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    style={styles.inlineLink}
                    className="signin-link"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                disabled={submitting}
                className="signin-input"
                style={styles.input}
              />
              {mode === 'signup' && password.length > 0 && (
                <div
                  style={{
                    ...styles.passwordHint,
                    color: passwordTooShort ? t.red : t.successText,
                  }}
                >
                  {passwordTooShort
                    ? `Password must be at least ${PASSWORD_MIN} characters`
                    : '✓ Looks good'}
                </div>
              )}
            </div>
          )}

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
            {buttonLabel}
          </button>
        </form>

        <div style={styles.bottomLinks}>
          {mode === 'signin' && (
            <button type="button" style={styles.linkButton} className="signin-link" onClick={() => switchMode('signup')}>
              Don&apos;t have an account? Sign up
            </button>
          )}
          {mode === 'signup' && (
            <button type="button" style={styles.linkButton} className="signin-link" onClick={() => switchMode('signin')}>
              Already have an account? Sign in
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" style={styles.linkButton} className="signin-link" onClick={() => switchMode('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationCard({ title, body, onBack, styles, eyeFill }) {
  return (
    <div style={styles.page}>
      <style>{signinCss}</style>
      <div style={styles.logoWrap}>
        <DaytuLogo size={64} eyeFill={eyeFill} />
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>{title}</h1>
        {body.map((line, i) => (
          <p key={i} style={styles.sentBody}>{line}</p>
        ))}
        <div style={styles.bottomLinks}>
          <button type="button" style={styles.linkButton} className="signin-link" onClick={onBack}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
