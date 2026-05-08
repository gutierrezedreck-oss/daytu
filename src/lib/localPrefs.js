export const LS_KEY = "daytu_v1";

export function clearLocalPrefs() {
  try { localStorage.removeItem(LS_KEY); } catch { /* localStorage blocked — proceed without clearing */ }
}

// Reads the userId that App.jsx's persist effect stamps into the LS blob.
// AuthGate compares this on SIGNED_IN to detect a cross-user prefs leak
// (different user signing in on a browser that still holds the prior user's
// daytu_v1 blob).
export function readBoundUserId() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.boundUserId ?? null;
  } catch {
    return null;
  }
}
