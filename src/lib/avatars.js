import { supabase } from './supabase.js';

// Decode a `data:image/...;base64,...` URI into a Blob suitable for
// Storage upload. Pure helper — no Supabase dependency, no I/O.
function dataUriToBlob(dataUri) {
  const [header, data] = dataUri.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Upload an avatar data URI to the `avatars` bucket at `{userId}/profile.jpg`
// (upsert). Returns the public URL with a cache-buster query string so
// callers/CDN refresh after a re-upload to the same path.
export async function uploadAvatar(userId, dataUri) {
  const blob = dataUriToBlob(dataUri);
  const path = `${userId}/profile.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) return { url: null, error };
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}
