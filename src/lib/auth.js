import { supabase } from './supabase.js';

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
