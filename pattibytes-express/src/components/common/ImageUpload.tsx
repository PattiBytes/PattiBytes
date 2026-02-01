/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-toastify';

interface ImageUploadProps {
  type: 'profile' | 'menu' | 'banner' | 'document';
  folder?: string; // ✅ NEW: fixes "Property 'folder' does not exist"
  currentImage?: string;
  onUpload: (url: string) => void;
  className?: string;
}

function defaultFolderByType(type: ImageUploadProps['type']) {
  switch (type) {
    case 'profile':
      return 'pattibytes/profile';
    case 'banner':
      return 'pattibytes/banners';
    case 'menu':
      return 'pattibytes/menu';
    case 'document':
      return 'pattibytes/documents';
    default:
      return 'pattibytes/uploads';
  }
}

export default function ImageUpload({
  type,
  folder,
  currentImage,
  onUpload,
  className = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPreview(currentImage || '');
  }, [currentImage]);

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !preset) {
      toast.error('Cloudinary env missing (CLOUD_NAME / UPLOAD_PRESET)');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('upload_preset', preset);
      form.append('folder', folder || defaultFolderByType(type));

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || 'Upload failed');

      const url = String(json.secure_url || '');
      if (!url) throw new Error('No secure_url returned');

      setPreview(url);
      onUpload(url);
      toast.success('Uploaded');
    } catch (e: any) {
      console.error('Cloudinary upload error:', e);
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onPickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Max 5MB allowed');
      return;
    }

    await uploadToCloudinary(file);
  };

  const removeImage = () => {
    setPreview('');
    onUpload('');
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
    {preview ? (
      <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-gray-200 bg-white">
        <Image
          src={preview}
          alt="Upload preview"
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
        />
        <button
          type="button"
          onClick={removeImage}
          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
        >
          <X size={16} />
        </button>
      </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-50 disabled:opacity-60"
        >
          <div className="flex flex-col items-center justify-center py-6">
            {uploading ? (
              <Loader2 className="animate-spin text-primary mb-2" size={32} />
            ) : (
              <Upload className="text-gray-400 mb-2" size={32} />
            )}
            <p className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Click to upload'}</p>
            <p className="text-xs text-gray-500 mt-1">PNG/JPG/WebP up to 5MB</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={onPickFile}
        disabled={uploading}
      />
    </div>
  );
}
