/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useRef, useState } from 'react';
import { Loader2, Save, X, Upload, ImageIcon, Clock, Calendar, Tag, CheckCircle2 } from 'lucide-react';
import { CATEGORIES, DAY_LABELS, UNITS, EMPTY_FORM } from './types';
import type { ProductFormData } from './types';
import { useStorageUpload } from '@/hooks/useStorageUpload';
import { toast } from 'react-toastify';

interface Props {
  initial?: ProductFormData;
  isEditing: boolean;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onClose: () => void;
  extraCategories?: { value: string; label: string; emoji: string }[];
}

export function ProductFormModal({
  initial = EMPTY_FORM, isEditing, onSubmit, onClose, extraCategories,
}: Props) {
  const [form,         setForm]         = useState<ProductFormData>(initial);
  const [submitting,   setSubmitting]   = useState(false);
  const [showTiming,   setShowTiming]   = useState(!!(initial.available_from || initial.available_to));
  // Blob URL shown ONLY during upload — never stored in form.imageurl
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress } = useStorageUpload();

  // Merged category list: preset + dynamic extras
  const allCats = [
    ...CATEGORIES,
    ...(extraCategories ?? []).filter(e => !CATEGORIES.find(c => c.value === e.value)),
  ];
  const isCustomCat = !!form.category && !CATEGORIES.find(c => c.value === form.category);

  const set = (k: keyof ProductFormData, v: any) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const toggleDay = (day: number) => {
    const days = form.available_days.includes(day)
      ? form.available_days.filter(d => d !== day)
      : [...form.available_days, day].sort();
    set('available_days', days);
  };

  // ── Image upload ────────────────────────────────────────────────────────────
  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show a local blob preview ONLY while uploading — not saved to form
    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);

    try {
      const cloudUrl = await upload(file);
      if (cloudUrl) {
        set('imageurl', cloudUrl);   // ← only Cloudinary https URL saved
        toast.success('Image uploaded ✓');
      } else {
        toast.error('Upload failed — check Cloudinary env vars');
      }
    } finally {
      URL.revokeObjectURL(blobUrl);
      setLocalPreview(null);
      e.target.value = '';           // allow re-picking same file
    }
  };

  const handleUrlChange = (val: string) => {
    // Block base64 / blob URLs from being typed/pasted into the URL field
    if (val.startsWith('data:') || val.startsWith('blob:')) {
      toast.error('Paste an https:// URL or use "Upload from device"');
      return;
    }
    set('imageurl', val);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Product name is required'); return; }
    const price = parseFloat(form.price);
    if (!price || price <= 0) { toast.error('Enter a valid price'); return; }
    if (!form.category.trim()) { toast.error('Select or enter a category'); return; }
    if (!form.unit.trim())     { toast.error('Select or enter a unit');     return; }
    if (uploading) { toast.error('Please wait for image upload to finish'); return; }

    // Final safety: reject if somehow a base64/blob crept in
    if (form.imageurl.startsWith('data:') || form.imageurl.startsWith('blob:')) {
      toast.error('Image not yet uploaded — please wait');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 rounded-xl border-2 border-gray-200 ' +
    'focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm transition-all';

  // What to show in the preview box
  const previewSrc = localPreview || (
    form.imageurl && !form.imageurl.startsWith('data:') && !form.imageurl.startsWith('blob:')
      ? form.imageurl
      : null
  );

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center
                 p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl
                   max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky header ── */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10
                        rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-lg font-black text-gray-900">
            {isEditing ? '✏️ Edit Product' : '➕ Add New Product'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Image upload ── */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Product Image
              {uploading && (
                <span className="ml-2 text-xs text-primary font-semibold animate-pulse">
                  Uploading to Cloudinary…
                </span>
              )}
            </label>
            <div className="flex gap-3 items-start">

              {/* Preview box */}
              <div className="relative w-24 h-24 rounded-xl border-2 border-dashed border-gray-200
                              overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center">
                {previewSrc ? (
                  <img src={previewSrc} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {form.imageurl && !uploading && (
                  <div className="absolute bottom-1 right-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400 drop-shadow" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="url" value={form.imageurl}
                  onChange={e => handleUrlChange(e.target.value)}
                  className={inputCls}
                  placeholder="https://… (paste direct image URL)"
                />
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <button
                  type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4
                             border-2 border-dashed border-primary/40 rounded-xl text-primary
                             font-semibold text-sm hover:bg-primary/5 transition-all disabled:opacity-60"
                >
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading to Cloudinary {progress}%</>
                    : <><Upload className="w-4 h-4" />Upload from device (auto-saves to Cloudinary)</>}
                </button>
                {uploading && (
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                {form.imageurl && !uploading && (
                  <button
                    type="button" onClick={() => set('imageurl', '')}
                    className="text-xs text-red-500 hover:underline font-semibold"
                  >
                    ✕ Remove image
                  </button>
                )}
                <input
                  ref={fileRef} type="file" accept="image/*"
                  className="hidden" onChange={handleImageFile}
                />
              </div>
            </div>
          </div>

          {/* ── Name & Category ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Name *</label>
              <input
                required value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputCls} placeholder="e.g. Fresh Milk"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
              <select
                value={isCustomCat ? '__custom__' : (form.category || '')}
                onChange={e => {
                  if (e.target.value === '__custom__') set('category', '');
                  else set('category', e.target.value);
                }}
                className={`${inputCls} font-semibold`}
              >
                <option value="">Select category…</option>
                {allCats.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
                <option value="__custom__">✏️ Custom category…</option>
              </select>
              {(isCustomCat || form.category === '') && (
                <div className="mt-2 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={form.category}
                    onChange={e =>
                      set('category', e.target.value.toLowerCase().replace(/\s+/g, '_'))
                    }
                    className={`${inputCls} pl-9`}
                    placeholder="e.g. cosmetics, bakery, beverages"
                    autoFocus
                  />
                </div>
              )}
              {form.category && isCustomCat && (
                <p className="text-xs text-orange-600 font-semibold mt-1">
                  🏷️ New category &ldquo;{form.category}&rdquo; will be created
                </p>
              )}
            </div>
          </div>

          {/* ── Price & Unit ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Price (₹) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                <input
                  required type="number" step="0.01" min="0" value={form.price}
                  onChange={e => set('price', e.target.value)}
                  className={`${inputCls} pl-7`} placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Unit *</label>
              <div className="space-y-2">
                <select
                  value={UNITS.includes(form.unit) ? form.unit : '__custom__'}
                  onChange={e => {
                    if (e.target.value !== '__custom__') set('unit', e.target.value);
                    else set('unit', '');
                  }}
                  className={inputCls}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="__custom__">✏️ Custom unit…</option>
                </select>
                {(!UNITS.includes(form.unit) || form.unit === '') && (
                  <input
                    value={form.unit}
                    onChange={e => set('unit', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. per 100g, per litre, strip, sachet…"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Description ── */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2} className={`${inputCls} resize-none`}
              placeholder="Short description (optional)…"
            />
          </div>

          {/* ── Stock & Sort ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Stock Qty</label>
              <input
                type="number" min="0" value={form.stock_qty}
                onChange={e => set('stock_qty', e.target.value)}
                className={inputCls} placeholder="Blank = unlimited"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Sort Order</label>
              <input
                type="number" min="0" value={form.sort_order}
                onChange={e => set('sort_order', e.target.value)}
                className={inputCls} placeholder="1 = first"
              />
            </div>
          </div>

          {/* ── Availability Timing (collapsible) ── */}
          <div className="border-2 border-gray-100 rounded-xl overflow-hidden">
            <button
              type="button" onClick={() => setShowTiming(!showTiming)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-all"
            >
              <span className="font-bold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Availability Timing
                <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              </span>
              <span className={`text-xs font-bold ${showTiming ? 'text-primary' : 'text-gray-400'}`}>
                {showTiming ? '▲ Hide' : '▼ Set timing'}
              </span>
            </button>

            {showTiming && (
              <div className="p-4 space-y-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Available From</label>
                    <input
                      type="time" value={form.available_from}
                      onChange={e => set('available_from', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5">Available Until</label>
                    <input
                      type="time" value={form.available_to}
                      onChange={e => set('available_to', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-2">
                    <Calendar className="w-3 h-3" /> Available Days
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DAY_LABELS.map((day, i) => (
                      <button
                        key={i} type="button" onClick={() => toggleDay(i)}
                        className={`w-10 h-10 rounded-full text-xs font-bold transition-all ${
                          form.available_days.includes(i)
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    {form.available_days.length === 7
                      ? 'Available every day'
                      : form.available_days.length === 0
                        ? '⚠️ No days selected — product hidden'
                        : `${form.available_days.length} day${form.available_days.length !== 1 ? 's' : ''} selected`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={submitting || uploading}
              className="flex-1 bg-gradient-to-r from-primary to-pink-600 text-white py-3 rounded-xl
                         font-bold hover:shadow-lg transition-all disabled:opacity-50
                         flex items-center justify-center gap-2"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" />Saving…</>
                : uploading
                  ? <><Loader2 className="w-5 h-5 animate-spin" />Uploading image…</>
                  : <><Save className="w-5 h-5" />{isEditing ? 'Update Product' : 'Add Product'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

