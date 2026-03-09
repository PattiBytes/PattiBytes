'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Props {
  value:     string | null;
  onChange:  (url: string | null) => void;
}

async function uploadImage(file: File): Promise<string> {
  // Validate
  if (!file.type.startsWith('image/')) throw new Error('Please upload an image file');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5 MB');

  // 1️⃣ Try Cloudinary via your existing /api/upload route
  try {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'custom-orders');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      const url = data?.url || data?.secure_url;
      if (url) return url;
    }
  } catch { /* fall through */ }

  // 2️⃣ Fallback: Supabase Storage bucket "custom-orders"
  const ext  = file.name.split('.').pop() || 'jpg';
  const path = `requests/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('custom-orders')
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage
    .from('custom-orders')
    .getPublicUrl(data.path);

  return publicUrl;
}

export function ImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-purple-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white
                       flex items-center justify-center shadow-lg hover:bg-red-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => !uploading && inputRef.current?.click()}
          className="border-2 border-dashed border-purple-300 rounded-2xl p-6
                     bg-purple-50 hover:bg-purple-100 transition cursor-pointer
                     flex flex-col items-center justify-center gap-2 min-h-[100px]"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
              <p className="text-sm font-semibold text-purple-500">Uploading…</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-200
                              flex items-center justify-center">
                <Upload className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-sm font-black text-purple-700">
                Tap to upload or drag & drop
              </p>
              <p className="text-xs text-purple-500 font-medium">
                JPG, PNG, WebP · max 5 MB
              </p>
            </>
          )}
        </div>
      )}

      {!value && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs
                     font-semibold text-purple-600 hover:text-purple-800 transition"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Attach reference image (optional)
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
