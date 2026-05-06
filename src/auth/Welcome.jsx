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
    eyeFill: '#fafafc',
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
    eyeFill: '#17161f',
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1172 1177" width={size} height={size} aria-label="Daytu">
      <path fill="#6e3de1" d={`
        M 287.71 45.14
        L 414.24 45.11
        C 422.94 44.81 428.30 45.44 436.14 48.98
        Q 443.17 52.15 447.83 58.63
        Q 456.13 70.17 453.27 84.81
        C 450.76 97.62 440.24 108.90 427.22 110.73
        Q 421.45 111.54 412.00 111.42
        C 387.98 111.11 367.81 111.45 342.92 111.35
        Q 327.63 111.28 291.91 111.22
        Q 265.98 111.18 254.42 112.95
        Q 220.90 118.11 192.93 135.18
        Q 172.97 147.37 156.05 165.77
        C 131.04 192.97 115.37 229.46 113.43 266.75
        C 112.87 277.44 113.24 287.33 113.24 300.73
        Q 113.21 774.19 113.12 894.50
        C 113.12 908.11 114.64 919.78 117.81 932.99
        C 122.32 951.77 130.70 969.51 141.39 985.54
        Q 142.10 986.59 150.27 997.15
        Q 155.00 1003.25 159.78 1008.06
        Q 181.93 1030.29 208.77 1042.95
        Q 214.71 1045.75 225.45 1049.63
        C 237.29 1053.92 250.38 1056.00 262.65 1057.43
        Q 269.89 1058.28 282.87 1058.03
        C 312.09 1057.46 346.64 1057.94 380.81 1057.92
        Q 540.24 1057.83 674.37 1057.96
        Q 693.00 1057.97 710.20 1057.89
        Q 741.39 1057.72 746.00 1057.73
        Q 810.35 1057.81 896.00 1057.93
        Q 918.42 1057.96 944.52 1049.94
        Q 970.80 1041.87 993.33 1024.99
        C 1002.38 1018.22 1011.00 1009.69 1018.16 1001.88
        Q 1019.00 1000.97 1024.92 993.33
        C 1042.43 970.76 1053.45 944.72 1057.40 916.55
        Q 1058.78 906.74 1058.77 885.37
        Q 1058.65 402.30 1058.99 278.76
        Q 1059.05 255.34 1053.72 235.05
        Q 1042.67 192.95 1012.68 161.81
        Q 1011.94 161.04 1001.90 151.82
        C 988.72 139.71 973.23 130.59 955.96 123.52
        Q 926.20 111.34 894.94 111.33
        Q 778.00 111.29 754.01 111.32
        C 744.98 111.34 736.10 109.14 729.31 103.24
        C 709.48 86.03 717.02 53.24 742.41 46.44
        Q 746.77 45.27 756.28 45.21
        Q 763.27 45.16 770.30 45.11
        L 899.19 45.20
        C 958.40 46.66 1015.07 70.85 1057.05 112.45
        Q 1062.72 118.08 1070.53 126.98
        C 1084.56 142.97 1095.72 161.56 1104.54 181.00
        C 1109.39 191.68 1114.49 205.79 1117.62 217.69
        Q 1121.87 233.82 1123.86 251.40
        Q 1125.20 263.17 1125.17 285.65
        Q 1125.00 405.16 1125.00 492.23
        Q 1125.01 581.84 1124.88 610.50
        Q 1124.73 646.54 1125.00 682.25
        Q 1125.05 688.74 1125.05 698.00
        Q 1125.07 795.45 1124.88 881.80
        Q 1124.82 908.44 1123.84 918.16
        Q 1122.06 935.73 1117.11 953.86
        Q 1115.07 961.33 1110.30 974.51
        Q 1106.25 985.71 1101.77 994.48
        Q 1085.55 1026.20 1064.31 1049.28
        C 1037.11 1078.86 1000.89 1102.30 961.75 1113.88
        Q 927.08 1124.14 893.50 1124.05
        Q 789.15 1123.77 687.00 1123.77
        Q 665.31 1123.77 433.50 1123.83
        Q 371.93 1123.85 279.00 1123.91
        Q 259.60 1123.93 245.32 1121.62
        Q 234.16 1119.81 221.46 1117.44
        A 0.11 0.10 -3.6 0 1 221.37 1117.37
        L 221.27 1117.08
        A 0.17 0.16 86.6 0 0 221.15 1116.97
        Q 207.88 1113.38 205.87 1112.60
        Q 197.48 1109.33 194.29 1108.16
        C 181.75 1103.55 168.60 1096.73 158.45 1090.56
        Q 122.94 1068.94 95.52 1034.48
        Q 93.89 1032.43 87.69 1023.79
        Q 83.40 1017.80 80.36 1012.76
        Q 51.69 965.22 47.33 909.24
        Q 46.60 899.81 46.76 884.75
        C 47.07 855.24 46.65 806.18 46.81 774.76
        C 46.92 751.70 46.70 730.52 46.74 708.75
        Q 46.93 605.52 46.87 590.25
        Q 46.71 548.16 46.70 535.00
        Q 46.64 474.34 46.80 414.17
        C 46.93 361.71 46.20 317.74 47.23 271.51
        Q 47.96 238.64 57.27 208.76
        Q 62.07 193.35 69.28 177.41
        Q 73.29 168.56 76.15 164.27
        C 79.92 158.61 82.22 153.51 86.49 147.35
        Q 93.97 136.56 100.72 128.36
        C 105.11 123.03 109.18 119.41 113.71 114.17
        Q 114.47 113.28 119.23 108.78
        Q 147.00 82.48 181.91 66.44
        Q 185.87 64.62 194.76 60.87
        Q 201.33 58.11 207.90 56.06
        C 233.74 48.03 260.63 44.78 287.71 45.14
        Z`} />
      <path fill="#7d5dec" d={`
        M 447.20 187.22
        C 442.74 194.02 430.32 199.43 422.00 199.44
        Q 310.89 199.69 283.90 199.41
        Q 270.65 199.27 263.22 200.84
        Q 244.55 204.77 230.24 216.15
        Q 206.78 234.82 201.90 265.38
        Q 200.87 271.84 200.90 284.28
        Q 200.99 315.61 200.94 512.78
        Q 200.86 838.22 200.90 889.80
        C 200.90 895.35 201.05 902.02 202.08 906.98
        Q 203.64 914.47 206.82 922.95
        C 208.88 928.45 211.69 932.59 215.36 938.13
        Q 219.21 943.92 222.63 946.78
        C 227.53 950.86 231.20 954.48 235.82 957.51
        Q 248.14 965.61 262.58 968.77
        Q 269.14 970.20 288.09 970.20
        Q 578.77 970.11 893.75 970.11
        Q 912.44 970.11 928.90 961.87
        C 935.40 958.61 943.51 952.60 948.96 947.09
        Q 971.17 924.64 971.14 890.26
        Q 971.06 775.41 971.13 279.00
        Q 971.13 263.30 965.79 248.87
        Q 963.41 242.44 959.24 235.97
        Q 953.90 227.66 950.65 224.22
        Q 947.23 220.60 941.03 215.38
        C 931.46 207.33 918.18 202.55 906.07 200.20
        Q 903.02 199.61 896.35 199.61
        Q 826.04 199.63 749.31 199.46
        Q 742.71 199.45 736.26 195.68
        C 730.89 192.55 726.31 189.56 723.17 184.10
        C 718.13 175.33 715.99 163.51 720.39 154.06
        Q 723.63 147.07 726.85 143.89
        Q 733.43 137.37 742.17 134.50
        Q 746.40 133.10 755.01 133.14
        Q 774.41 133.23 883.00 132.96
        Q 894.27 132.93 904.10 133.51
        Q 915.67 134.18 924.92 136.44
        Q 939.78 140.07 953.75 146.26
        C 964.79 151.15 973.86 157.32 983.09 164.44
        Q 989.82 169.63 995.27 175.24
        Q 1019.76 200.46 1030.57 233.71
        Q 1036.65 252.43 1037.12 273.51
        C 1037.52 291.45 1037.14 308.19 1037.14 327.43
        Q 1037.21 697.23 1037.12 896.95
        Q 1037.11 914.24 1031.25 933.55
        Q 1025.24 953.36 1014.19 970.70
        Q 1008.10 980.26 997.16 992.13
        C 987.04 1003.09 975.20 1011.68 962.42 1018.81
        Q 951.30 1025.01 938.61 1028.94
        C 924.31 1033.37 910.87 1036.02 896.57 1036.04
        Q 842.05 1036.13 287.98 1036.11
        Q 267.22 1036.11 258.16 1034.71
        Q 237.22 1031.49 218.50 1023.23
        Q 211.52 1020.15 199.12 1012.37
        Q 192.78 1008.40 187.73 1003.99
        Q 177.79 995.32 176.81 994.37
        Q 173.31 990.97 166.25 982.48
        C 156.07 970.24 148.17 954.95 143.02 939.95
        Q 138.30 926.20 136.19 911.91
        Q 135.02 903.96 135.03 883.05
        Q 135.13 666.16 135.06 278.00
        Q 135.05 266.77 136.45 256.25
        Q 137.43 248.84 141.51 234.46
        Q 144.39 224.30 149.86 213.72
        Q 158.16 197.65 165.61 188.30
        C 178.28 172.40 194.66 158.38 212.52 149.27
        Q 221.86 144.50 233.73 140.33
        Q 254.14 133.17 277.75 133.12
        Q 342.61 132.99 411.75 133.12
        Q 418.44 133.13 423.93 133.37
        C 430.46 133.66 436.56 136.90 441.68 140.35
        C 448.02 144.61 453.57 154.96 454.03 162.61
        C 454.51 170.73 452.04 179.85 447.20 187.22
        Z`} />
      <path fill="#9f89ef" d={`
        M 881.93 287.55
        Q 880.47 287.38 874.75 287.38
        Q 800.84 287.34 750.25 287.41
        C 743.40 287.42 737.27 284.77 731.63 280.93
        C 722.52 274.73 717.16 263.44 718.24 252.25
        C 718.76 246.87 719.46 241.97 722.38 237.42
        Q 729.25 226.72 741.11 223.02
        Q 745.65 221.61 755.54 221.59
        Q 824.94 221.49 873.75 221.53
        Q 885.33 221.54 889.27 221.37
        Q 899.35 220.93 904.68 222.12
        C 913.15 224.03 922.50 227.47 928.83 233.42
        C 934.13 238.41 939.29 243.64 942.35 249.74
        Q 945.92 256.86 947.90 265.49
        Q 949.01 270.36 949.00 282.13
        Q 948.79 763.91 949.03 891.51
        Q 949.06 908.08 941.94 920.49
        C 933.77 934.74 920.21 944.12 904.25 947.35
        Q 900.39 948.14 889.20 948.14
        Q 335.29 948.16 278.25 948.19
        Q 271.57 948.19 267.69 947.31
        C 256.84 944.84 245.94 939.67 238.62 931.96
        Q 231.53 924.49 227.31 915.43
        Q 226.61 913.94 224.25 904.88
        C 222.34 897.58 222.68 890.10 222.68 882.00
        Q 222.68 467.97 222.73 283.65
        Q 222.73 270.68 224.15 265.00
        Q 226.11 257.18 229.18 250.78
        Q 231.96 245.00 237.97 238.59
        C 247.11 228.85 261.76 221.46 275.76 221.50
        Q 308.82 221.59 424.57 221.54
        C 430.73 221.53 438.58 226.11 443.30 229.76
        C 450.86 235.61 455.03 247.66 453.96 257.37
        Q 452.10 274.19 436.61 283.37
        Q 429.31 287.70 421.98 287.50
        Q 418.22 287.40 412.39 287.40
        Q 344.17 287.39 303.00 287.33
        Q 297.37 287.33 289.34 287.57
        A 0.78 0.78 0.0 0 0 288.58 288.35
        L 288.58 881.38
        A 0.70 0.70 0.0 0 0 289.28 882.08
        L 882.35 882.08
        A 0.68 0.68 0.0 0 0 883.03 881.40
        L 883.03 288.77
        A 1.23 1.23 0.0 0 0 881.93 287.55
        Z`} />
      <rect x="690.52" y="459.04" width="56.12" height="275.12" rx="27.46" fill={eyeFill} />
      <rect x="426.09" y="459.03" width="55.90" height="275.22" rx="27.35" fill={eyeFill} />
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
