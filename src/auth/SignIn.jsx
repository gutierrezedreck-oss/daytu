import { useState } from 'react';
import { signUp, signIn, sendPasswordReset } from '../lib/auth.js';

const PASSWORD_MIN = 8;

const styles = {
  screen: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f7',
    padding: 24,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '32px 28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  title: {
    margin: '0 0 8px',
    fontSize: 22,
    fontWeight: 600,
    color: '#111',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    margin: '0 0 24px',
    fontSize: 14,
    color: '#6b7280',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
    color: '#111',
    background: '#fff',
  },
  passwordHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 1.4,
  },
  button: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 15,
    fontWeight: 500,
    color: '#fff',
    background: '#111',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginTop: 18,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  linkButton: {
    background: 'transparent',
    border: 'none',
    color: '#2563eb',
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  inlineLink: {
    background: 'transparent',
    border: 'none',
    color: '#2563eb',
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
  },
  error: {
    marginTop: 12,
    padding: '10px 12px 10px 14px',
    background: '#fef2f2',
    borderLeft: '3px solid #dc2626',
    borderRadius: '0 6px 6px 0',
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 1.4,
  },
  bottomLinks: {
    marginTop: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
  },
  sentBody: {
    margin: '0 0 6px',
    fontSize: 14,
    color: '#374151',
    lineHeight: 1.5,
  },
};

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
        // Confirmation ON: tell the user to check email.
        setStatus('signup-sent');
      } else {
        // reset
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

  // ── Confirmation states ───────────────────────────────────
  if (status === 'signup-sent') {
    return (
      <ConfirmationCard
        title="Check your email"
        body={[
          <>We sent a verification link to <strong>{email}</strong>.</>,
          'Click the link to verify your account, then come back here to sign in.',
        ]}
        onBack={() => switchMode('signin')}
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
      />
    );
  }

  // ── Form ──────────────────────────────────────────────────
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
    <div style={styles.screen}>
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
            style={styles.input}
          />

          {mode !== 'reset' && (
            <div style={{ marginTop: 14 }}>
              <div style={styles.labelRow}>
                <label htmlFor="signin-password" style={styles.label}>Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    style={styles.inlineLink}
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
                style={styles.input}
              />
              {mode === 'signup' && password.length > 0 && (
                <div
                  style={{
                    ...styles.passwordHint,
                    color: passwordTooShort ? '#b91c1c' : '#059669',
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
            <button type="button" style={styles.linkButton} onClick={() => switchMode('signup')}>
              Don&apos;t have an account? Sign up
            </button>
          )}
          {mode === 'signup' && (
            <button type="button" style={styles.linkButton} onClick={() => switchMode('signin')}>
              Already have an account? Sign in
            </button>
          )}
          {mode === 'reset' && (
            <button type="button" style={styles.linkButton} onClick={() => switchMode('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmationCard({ title, body, onBack }) {
  return (
    <div style={styles.screen}>
      <div style={styles.card}>
        <h1 style={styles.title}>{title}</h1>
        {body.map((line, i) => (
          <p key={i} style={styles.sentBody}>{line}</p>
        ))}
        <div style={styles.bottomLinks}>
          <button type="button" style={styles.linkButton} onClick={onBack}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
