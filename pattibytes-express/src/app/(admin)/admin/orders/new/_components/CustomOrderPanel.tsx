'use client';
import { useState } from 'react';
import { FileText, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { IC } from './utils';

const CUSTOM_CATS = [
  'bakery', 'grocery', 'clothing', 'dairy',
  'electronics', 'medicine', 'stationery', 'other',
];

interface Props {
  customCategory:    string;
  setCustomCategory: (v: string) => void;
  customDescription:    string;
  setCustomDescription: (v: string) => void;
  customImageUrl:    string;
  setCustomImageUrl: (v: string) => void;
}

export function CustomOrderPanel({
  customCategory, setCustomCategory,
  customDescription, setCustomDescription,
  customImageUrl, setCustomImageUrl,
}: Props) {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `custom-orders/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('order-images')
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('order-images').getPublicUrl(path);
      setCustomImageUrl(urlData.publicUrl);
      toast.success('Image uploaded ✅');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl
                    shadow-sm border border-purple-100 p-5 space-y-4">
      <h2 className="font-bold text-gray-900 flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-purple-500 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </span>
        Custom Order Details
      </h2>

      {/* Category chips */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {CUSTOM_CATS.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCustomCategory(
                customCategory === cat ? '' : cat
              )}
              className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold
                          capitalize transition-all duration-150 ${
                customCategory === cat
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'border-gray-200 text-gray-600 hover:border-purple-300 hover:bg-purple-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">
          Description / Instructions
        </label>
        <textarea
          rows={3}
          value={customDescription}
          onChange={e => setCustomDescription(e.target.value)}
          placeholder="Describe what the customer needs in detail…"
          className={`${IC} resize-none`}
        />
      </div>

      {/* Image upload */}
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-2">
          Reference Image (optional)
        </label>

        {customImageUrl ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-purple-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={customImageUrl} alt="ref" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setCustomImageUrl('')}
              className="absolute top-1 right-1 p-1 bg-black/60 rounded-lg
                         text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center gap-2
                             border-2 border-dashed border-purple-200 rounded-xl p-6
                             cursor-pointer hover:bg-purple-50 transition-colors ${
                               uploading ? 'opacity-60 pointer-events-none' : ''
                             }`}>
            {uploading
              ? <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              : <Upload className="w-6 h-6 text-purple-400" />
            }
            <span className="text-xs font-semibold text-gray-500">
              {uploading ? 'Uploading…' : 'Click to upload image'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
          </label>
        )}

        {/* Or paste URL */}
        <input
          type="url"
          value={customImageUrl}
          onChange={e => setCustomImageUrl(e.target.value)}
          placeholder="…or paste image URL"
          className={`${IC} mt-2`}
        />
      </div>
    </div>
  );
}
