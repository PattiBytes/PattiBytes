'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  type: 'profile' | 'menu' | 'banner' | 'document';
  currentImage?: string;
  onUpload: (url: string) => void;
  className?: string;
}

export default function ImageUpload({ type, currentImage, onUpload, className = '' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${type}/${fileName}`;

      // Upload to Supabase Storage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { error: uploadError, data } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onUpload(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error uploading image!');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setPreview('');
    onUpload('');
  };

  return (
    <div className={`relative ${className}`}>
      {preview ? (
        <div className="relative w-full h-full rounded-lg overflow-hidden border-2 border-gray-200">
          <Image
            src={preview}
            alt="Upload preview"
            fill
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
        <label className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-50">
          <div className="flex flex-col items-center justify-center py-6">
            {uploading ? (
              <Loader2 className="animate-spin text-primary mb-2" size={32} />
            ) : (
              <Upload className="text-gray-400 mb-2" size={32} />
            )}
            <p className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={uploadImage}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
