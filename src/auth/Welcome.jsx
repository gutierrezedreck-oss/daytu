import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

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
    maxWidth: 400,
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
    lineHeight: 1.5,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 6,
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    overflow: 'hidden',
  },
  inputPrefix: {
    padding: '0 4px 0 12px',
    color: '#9ca3af',
    fontSize: 15,
    userSelect: 'none',
  },
  input: {
    flex: 1,
    padding: '10px 12px 10px 4px',
    fontSize: 15,
    border: 'none',
    outline: 'none',
    color: '#111',
    background: 'transparent',
    minWidth: 0,
  },
  status: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 1.4,
    minHeight: 18,
  },
  statusIdle:      { color: '#6b7280' },
  statusChecking:  { color: '#6b7280' },
  statusAvailable: { color: '#059669' },
  statusTaken:     { color: '#b91c1c' },
  statusInvalid:   { color: '#b91c1c' },
  error: {
    marginTop: 12,
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    color: '#991b1b',
    fontSize: 13,
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
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

function sanitize(input) {
  return input
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

export default function Welcome({ initialHandle = '', onDone }) {
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

  const statusStyle = {
    idle:      styles.statusIdle,
    invalid:   styles.statusInvalid,
    checking:  styles.statusChecking,
    available: styles.statusAvailable,
    taken:     styles.statusTaken,
  }[availability];

  const statusText = {
    idle:      '3–20 characters: letters, numbers, underscores',
    invalid:   'Use letters, numbers, or underscores only (3–20 chars)',
    checking:  'Checking availability…',
    available: '✓ Available',
    taken:     'Taken — try another',
  }[availability];

  const submitDisabled = availability !== 'available' || submitting;

  return (
    <div style={styles.screen}>
      <div style={styles.card}>
        <h1 style={styles.title}>Pick a username</h1>
        <p style={styles.subtitle}>
          This is how friends find you on daytu. You can change it later.
        </p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="welcome-handle" style={styles.label}>
            Username
          </label>
          <div style={styles.inputWrap}>
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
          <div style={{ ...styles.status, ...statusStyle }}>{statusText}</div>
          {error && <div style={styles.error}>{error}</div>}
          <button
            type="submit"
            disabled={submitDisabled}
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
