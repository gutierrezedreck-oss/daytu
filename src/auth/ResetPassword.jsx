import { useState } from 'react';
import { updatePassword } from '../lib/auth.js';

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
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
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
  hint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 1.4,
    minHeight: 16,
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
};

function friendlyError(msg) {
  if (!msg) return 'Could not update password. Try again.';
  if (/password should be at least/i.test(msg)) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (/new password should be different|same password/i.test(msg)) return 'New password must be different from your previous one.';
  if (/auth session missing|invalid|expired/i.test(msg)) return 'This reset link has expired. Request a new one from the sign-in screen.';
  if (/rate limit|too many requests|\b429\b/i.test(msg)) return 'Too many requests — please wait a minute and try again.';
  return msg;
}

export default function ResetPassword({ onDone }) {
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
      onDone?.();
    } catch (err) {
      setError(friendlyError(err?.message));
      setSubmitting(false);
    }
  }

  return (
    <div style={styles.screen}>
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
            style={styles.input}
          />
          <div
            style={{
              ...styles.hint,
              color: tooShort ? '#b91c1c' : longEnough ? '#059669' : '#6b7280',
            }}
          >
            {password.length === 0
              ? `Must be at least ${PASSWORD_MIN} characters`
              : tooShort
              ? `Password must be at least ${PASSWORD_MIN} characters`
              : '✓ Looks good'}
          </div>

          <div style={{ marginTop: 14 }}>
            <label htmlFor="reset-confirm" style={styles.label}>Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              disabled={submitting}
              style={styles.input}
            />
            {confirm.length > 0 && (
              <div
                style={{
                  ...styles.hint,
                  color: mismatched ? '#b91c1c' : matches ? '#059669' : '#6b7280',
                }}
              >
                {mismatched ? "Passwords don't match" : matches ? '✓ Matches' : ''}
              </div>
            )}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={submitDisabled}
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
