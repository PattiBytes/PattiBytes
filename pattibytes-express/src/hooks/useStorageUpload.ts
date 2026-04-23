// hooks/useStorageUpload.ts
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { uploadToSupabase } from '@/lib/storage';

export function useStorageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);

  const upload = useCallback(async (file: File, folder = 'general'): Promise<string | null> => {
    setUploading(true);
    setProgress(0);
    try {
      setProgress(30);
      const url = await uploadToSupabase(file, folder);
      setProgress(100);
      return url;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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