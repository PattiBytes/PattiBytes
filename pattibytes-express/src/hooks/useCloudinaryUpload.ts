/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;

export function useCloudinaryUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);

  const upload = useCallback(async (file: File): Promise<string | null> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      toast.error('Cloudinary env vars missing (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET)');
      return null;
    }
    setUploading(true);
    setProgress(0);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      fd.append('folder', 'pattibytes/products');

      return await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status === 200) {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url as string);
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('POST', url);
        xhr.send(fd);
      });
    } catch (e: any) {
      toast.error(e?.message || 'Image upload failed');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  return { upload, uploading, progress };
}
