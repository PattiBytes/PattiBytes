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
const presetImages = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_IMAGES || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const presetVideos = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_VIDEOS || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const presetAvatars = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_AVATARS || presetImages;

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && (presetImages || presetVideos));
}

function presetFor(type: UploadType): string {
  if (type === 'avatar') return presetAvatars || presetImages;
  if (type === 'video') return presetVideos;
  return presetImages;
}

export async function uploadImageOrAvatar(file: File, type: Extract<UploadType, 'image' | 'avatar'> = 'image'): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and upload presets.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', presetFor(type));

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(endpoint, { method: 'POST', body: form });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed: ${res.status} ${err}`);
  }

  const data = (await res.json()) as CloudinaryResponse;
  if (!data.secure_url) throw new Error('No secure_url returned from Cloudinary');
  return data.secure_url;
}

export async function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and upload presets.');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', presetFor('video'));

  return new Promise<string>((resolve, reject) => {
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
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status} ${xhr.responseText || ''}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));

    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.send(form);
  });
}

export async function uploadToCloudinary(file: File, type: UploadType = 'image'): Promise<string> {
  return type === 'video' ? uploadVideo(file) : uploadImageOrAvatar(file, type as 'image' | 'avatar');
}

export function transformImage(
  url: string,
  opts: { w?: number; h?: number; q?: string; f?: string; crop?: 'fill' | 'fit' | 'scale' } = {}
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

export async function deleteFromCloudinary(publicId: string, resourceType?: 'image' | 'video'): Promise<void> {
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
