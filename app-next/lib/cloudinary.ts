// app-next/lib/cloudinary.ts
export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width?: number;
  height?: number;
  format?: string;
  resource_type: 'image' | 'video' | string;
  bytes?: number;
  duration?: number;
}

export type UploadType = 'image' | 'video' | 'avatar';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const presetImages =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_IMAGES ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  '';
const presetVideos =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_VIDEOS ||
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  '';
const presetAvatars =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARS || presetImages;

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && (presetImages || presetVideos));
}

function presetFor(type: UploadType): string {
  if (type === 'avatar') return presetAvatars || presetImages;
  if (type === 'video') return presetVideos;
  return presetImages;
}

/**
 * Upload via signed API route (fallback method - more reliable)
 */
async function uploadViaAPI(file: File, type: UploadType): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('type', type);

  const res = await fetch('/api/cloudinary/upload', {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as CloudinaryResponse;
  if (!data.secure_url) throw new Error('No secure_url returned from API');
  return data.secure_url;
}

/**
 * Direct unsigned upload to Cloudinary (requires unsigned preset enabled)
 */
export async function uploadImageOrAvatar(
  file: File,
  type: Extract<UploadType, 'image' | 'avatar'> = 'image',
): Promise<string> {
  // AUTO-DETECT: If it is actually a video, route to uploadVideo
  if (file.type.startsWith('video/')) {
    console.warn('Video file passed to uploadImageOrAvatar, routing to uploadVideo');
    return uploadVideo(file);
  }

  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and upload presets.',
    );
  }

  const preset = presetFor(type);
  if (!preset) {
    throw new Error(`No upload preset configured for ${type}`);
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', preset);

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      // For ANY 4xx (including 420 OCR error), fallback to signed API upload
      if (res.status >= 400 && res.status < 500) {
        console.warn('Unsigned upload failed, trying signed API route...', res.status, raw);
        return await uploadViaAPI(file, type);
      }
      throw new Error(`Cloudinary upload failed: ${res.status} ${raw}`);
    }

    const data = (await res.json()) as CloudinaryResponse;
    if (!data.secure_url) throw new Error('No secure_url returned from Cloudinary');
    return data.secure_url;
  } catch (error) {
    // Network error or CORS issue - fallback to API route
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Network/CORS error, trying signed API route...', error);
      return await uploadViaAPI(file, type);
    }
    throw error;
  }
}

/**
 * Upload video with progress tracking
 */
export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and upload presets.',
    );
  }

  const preset = presetFor('video');
  if (!preset) {
    throw new Error('No video upload preset configured');
  }

  // Try unsigned upload first
  return new Promise<string>((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', preset);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText) as CloudinaryResponse;
          if (!data.secure_url) return reject(new Error('No secure_url returned'));
          resolve(data.secure_url);
        } catch {
          reject(new Error('Invalid Cloudinary response'));
        }
        return;
      }

      // For any 4xx (including 420), fall back to signed API upload
      if (xhr.status >= 400 && xhr.status < 500) {
        console.warn('Unsigned video upload failed, trying signed API route...', xhr.status, xhr.responseText);
        uploadViaAPI(file, 'video')
          .then(resolve)
          .catch(reject);
        return;
      }

      reject(
        new Error(
          `Cloudinary upload failed: ${xhr.status} ${xhr.responseText || ''}`,
        ),
      );
    });

    xhr.addEventListener('error', () => {
      // Network error - try API fallback
      console.warn('XHR network error, trying signed API route...');
      uploadViaAPI(file, 'video')
        .then(resolve)
        .catch(reject);
    });

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.send(form);
  });
}

/**
 * Main upload function - handles all file types
 */
export async function uploadToCloudinary(
  file: File,
  type: UploadType = 'image',
  onProgress?: (percent: number) => void,
): Promise<string> {
  return type === 'video'
    ? uploadVideo(file, onProgress)
    : uploadImageOrAvatar(file, type as 'image' | 'avatar');
}

/**
 * Transform Cloudinary image URL with options
 */
export function transformImage(
  url: string,
  opts: {
    w?: number;
    h?: number;
    q?: string;
    f?: string;
    crop?: 'fill' | 'fit' | 'scale';
  } = {},
): string {
  try {
    const u = new URL(url);
    if (!u.host.includes('res.cloudinary.com') || !u.pathname.includes('/image/upload/')) return url;

    const parts = u.pathname.split('/image/upload/');
    const prefix = parts[0];
    const rest = parts[1];

    const t = [
      opts.w ? `w_${opts.w}` : null,
      opts.h ? `h_${opts.h}` : null,
      `c_${opts.crop || 'fill'}`,
      `f_${opts.f || 'auto'}`,
      `q_${opts.q || 'auto'}`,
    ]
      .filter(Boolean)
      .join(',');

    u.pathname = `${prefix}/image/upload/${t}/${rest}`;
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Delete media from Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType?: 'image' | 'video',
): Promise<void> {
  const res = await fetch('/api/cloudinary/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId, resourceType }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to delete media: ${res.status} ${text}`);
  }
}
