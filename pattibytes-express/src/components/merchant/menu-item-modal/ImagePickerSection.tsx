'use client';
import { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Copy, Link2, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { uploadToStorage } from '@/lib/storage';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { copyText, isDataImageUrl, isValidHttpUrl, isValidImageSource } from './helpers';

export interface ImagePickerProps {
  imageUrl:   string;
  onChange:   (url: string) => void;
  onAutosave: (url: string) => void;
}

export function ImagePickerSection({ imageUrl, onChange, onAutosave }: ImagePickerProps) {
  const [mode,      setMode]      = useState<'upload' | 'link'>(() => imageUrl ? 'link' : 'upload');
  const [uploading, setUploading] = useState(false);

  const doUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToStorage(file, 'menu-items');
      onChange(url); onAutosave(url);
      toast.success('Image uploaded & saved');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally { setUploading(false); }
  }, [onChange, onAutosave]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file  = e.target.files?.[0];
  const input = e.currentTarget;          // ← capture before any await
  if (!file) return;
  await doUpload(file);
  input.value = '';                        // ← safe: uses captured ref
};

  const handleClipboardBtn = async () => {
    try {
      if (typeof navigator?.clipboard?.read === 'function') {
        const items = await navigator.clipboard.read();
        for (const ci of items) {
          const type = ci.types.find(t => t.startsWith('image/'));
          if (type) { await doUpload(new File([await ci.getType(type)], 'clipboard.png', { type })); return; }
        }
        toast.info('No image in clipboard'); return;
      }
      toast.error('Use Ctrl+V to paste instead');
    } catch { toast.error('Clipboard blocked — use Ctrl+V'); }
  };

  const imageOk = isValidImageSource(imageUrl);

  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">Item Image</span>
        <div className="flex gap-1.5">
          {(['upload', 'link'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                mode === m ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}>
              {m === 'upload' ? '⬆ Upload' : '🔗 Link'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {/* Preview */}
        <div className="w-full sm:w-36 shrink-0 space-y-2">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Preview"
              className="w-full h-36 object-cover rounded-xl border bg-white shadow-sm"
              onError={e => (e.currentTarget.src = '/placeholder-food.png')}
            />
          ) : (
            <div
              onClick={() => mode === 'upload' && document.getElementById('menu-img-input')?.click()}
              className="w-full h-36 bg-white rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-primary hover:bg-orange-50 transition"
            >
              {uploading ? <Loader2 className="animate-spin text-primary" size={28} />
                : mode === 'link' ? <Link2 className="text-gray-300" size={28} />
                : <Upload className="text-gray-300" size={28} />}
              <span className="text-[10px] text-gray-400 mt-2 font-semibold">
                {uploading ? 'Uploading…' : 'Click or Ctrl+V'}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => { onChange(''); onAutosave(''); }} disabled={!imageUrl}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border bg-white hover:bg-red-50 hover:border-red-300 text-xs font-semibold disabled:opacity-40 transition">
              <Trash2 size={13} /> Remove
            </button>
            <button type="button" onClick={async () => { await copyText(imageUrl); if (imageUrl) toast.success('Copied!'); }} disabled={!imageUrl}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border bg-white hover:bg-gray-100 text-xs font-semibold disabled:opacity-40 transition">
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          {mode === 'upload' ? (
            <div className="space-y-3">
              <input type="file" accept="image/*" id="menu-img-input" className="hidden" disabled={uploading} onChange={handleFileInput} />
              <div className="flex flex-wrap gap-2">
                <label htmlFor="menu-img-input"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-gray-800 font-semibold text-sm cursor-pointer hover:bg-gray-50 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={15} /> {uploading ? 'Uploading…' : 'Choose file'}
                </label>
                <button type="button" disabled={uploading} onClick={handleClipboardBtn}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition">
                  <Clipboard size={15} /> Paste
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 font-mono text-[10px]">Ctrl+V</kbd> anywhere in this modal to paste a screenshot.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="text" value={imageUrl}
                  onChange={e => onChange(e.target.value)}
                  onBlur={e => { const url = e.target.value.trim(); if (url && isValidHttpUrl(url)) onAutosave(url); }}
                  placeholder="https://cdn.example.com/img.jpg"
                  className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition ${imageOk ? 'border-gray-300' : 'border-red-400 bg-red-50'}`}
                />
                {imageUrl && (imageOk
                  ? <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                  : <AlertTriangle className="text-red-500 shrink-0" size={18} />)}
              </div>
              {!imageOk && <p className="text-xs text-red-600">Must be a valid http/https URL or data:image string.</p>}
              <p className="text-xs text-gray-500">Tip: Paste URL with Ctrl+V. Saves when you leave this field.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

