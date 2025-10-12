// lib/uploads.ts
import { uploadToSupabaseAvatar, isSupabaseConfigured } from '@/lib/supabase';
import { uploadImageOrAvatar, isCloudinaryConfigured } from '@/lib/cloudinary';

export async function uploadImageAuto(file: File, opts?: { uid?: string; type?: 'avatar' | 'image' }) {
  const type = opts?.type || 'image';
  if (isCloudinaryConfigured()) {
    return uploadImageOrAvatar(file, type === 'avatar' ? 'avatar' : 'image');
  }
  if (isSupabaseConfigured()) {
    if (!opts?.uid) throw new Error('Supabase avatar upload needs a uid');
    return uploadToSupabaseAvatar(file, { uid: opts.uid });
  }
  throw new Error('No upload provider configured');
}
