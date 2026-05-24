import { supabase } from './supabase.js';

// Minimum password length enforced client-side for sign-up, reset-password,
// and in-session change-password flows. Supabase's server-side minimum is
// configurable; this is our app's stricter floor. Single source of truth so
// all consumers display the same length in their hints.
export const PASSWORD_MIN = 8;

// Translate Supabase auth error messages from updateUser({ password }) into
// user-friendly text. Shared between ResetPassword (reset-link → set new
// password) and EditProfileSheet (in-session change-password).
//
// The session-expired branch's message differs by context — in the reset
// flow it points to "request a new link"; in the change-password flow it
// points to "sign in again". Caller passes context to disambiguate.
export function friendlyPasswordError(msg, { context = 'change' } = {}) {
  if (!msg) return 'Could not update password. Try again.';
  if (/password should be at least/i.test(msg)) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (/new password should be different|same password/i.test(msg)) return 'New password must be different from your previous one.';
  if (/auth session missing|invalid|expired/i.test(msg)) {
    return context === 'reset'
      ? 'This reset link has expired. Request a new one from the sign-in screen.'
      : 'Your session expired. Sign in again and try again.';
  }
  if (/rate limit|too many requests|\b429\b/i.test(msg)) return 'Too many requests — please wait a minute and try again.';
  return msg;
}

export function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export function sendPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/reset-password',
  });
}

export function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword });
}

export function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeToAuth(callback) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}
