// pattibytes-express/src/lib/storage.ts
import { supabase } from './supabase';

const BUCKET_MAP: Record<string, string> = {
  'pattibytes/avatars': 'profiles',
  'pattibytes/profiles': 'profiles',
  'pattibytes/banners': 'merchants',
  'pattibytes/menu': 'menu-items',
  'pattibytes/menus': 'menu-items',
  'pattibytes/documents': 'merchants',
  'pattibytes/uploads': 'app-assets',
  'pattibytes/products': 'products',
  'menu-items': 'menu-items',
  'general': 'app-assets',
};

function getBucket(folder: string): string {
  return BUCKET_MAP[folder] ?? 'app-assets';
}

function getCacheControl(folder: string) {
  if (folder.includes('avatars') || folder.includes('profiles')) return '86400';
  return '31536000';
}

function extFromFile(file: File) {
  return file.name.split('.').pop()?.toLowerCase() || 'jpg';
}

export async function uploadToSupabase(
  file: File,
  folder: string = 'general',
  entityId?: string
): Promise<string> {
  if (!file) throw new Error('No file provided');
  if (!file.type.startsWith('image/')) throw new Error('Please upload an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image size should be less than 5MB');

  const bucket = getBucket(folder);
  const ext = extFromFile(file);
  const version = Date.now();

  const cleanFolder =
    folder === 'pattibytes/banners' ? 'merchants/banner' :
    folder === 'pattibytes/menu' || folder === 'pattibytes/menus' ? 'menu-items/item' :
    folder === 'pattibytes/products' ? 'products/product' :
    folder === 'pattibytes/avatars' || folder === 'pattibytes/profiles' ? 'profiles/avatar' :
    'app-assets/file';

  const path = entityId
    ? `${cleanFolder}/${entityId}/${version}.${ext}`
    : `${cleanFolder}/${version}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: getCacheControl(folder),
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export const uploadToStorage = uploadToSupabase;

export async function deleteFromStorage(filePath: string, bucket: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  if (error) console.error('Storage delete error:', error.message);
}