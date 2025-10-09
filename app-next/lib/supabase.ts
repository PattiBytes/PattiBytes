// lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) return null;
  client = createClient(url, anon, {
    auth: {
      persistSession: false, // Using Firebase for auth
    },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Upload an avatar image to Supabase Storage (bucket: avatars).
 * Assumes bucket 'avatars' is public; otherwise, create a signed URL.
 */
export async function uploadToSupabaseAvatar(
  file: File,
  opts: { uid: string; bucket?: string }
): Promise<string> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase is not configured');

  const bucket = opts.bucket || 'avatars';
  const ts = Date.now();
  const cleanName = file.name.replace(/\s+/g, '-');
  const path = `${opts.uid}/${ts}-${cleanName}`;

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  });

  if (error) throw new Error(error.message || 'Supabase upload failed');

  // Public bucket URL
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(data.path);
  if (!pub?.publicUrl) throw new Error('Failed to generate public URL');

  return pub.publicUrl;
}
