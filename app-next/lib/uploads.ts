// lib/uploads.ts
import { isCloudinaryConfigured, uploadToCloudinary } from './cloudinary';
import { isSupabaseConfigured, uploadToSupabaseAvatar } from './supabase';

export async function uploadImageAuto(
  file: File,
  opts: { uid?: string } = {}
): Promise<string> {
  if (isCloudinaryConfigured()) {
    return await uploadToCloudinary(file);
  }
  if (isSupabaseConfigured()) {
    const uid = opts.uid || 'anonymous';
    return await uploadToSupabaseAvatar(file, { uid });
  }
  throw new Error('No image provider configured. Configure Cloudinary or Supabase in .env.local');
}
