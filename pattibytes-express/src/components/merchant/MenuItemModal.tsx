/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { menuService } from '@/services/menu';
import { MenuItem } from '@/types';
import {
  X,
  Upload,
  Link2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clipboard,
  Copy,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface MenuItemModalProps {
  item: MenuItem | null;
  merchantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function isValidHttpUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isDataImageUrl(v: string) {
  const s = String(v || '').trim();
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(s);
}

function isValidImageSource(v: string) {
  if (!v) return true; // optional
  return isValidHttpUrl(v) || isDataImageUrl(v);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extFromMime(mime: string) {
  const m = (mime || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  return 'png';
}

function dataUrlToFile(dataUrl: string, filenameBase = 'pasted-image') {
  const s = dataUrl.trim();
  const match = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const mime = match[1];
  const b64 = match[2];

  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

  const ext = extFromMime(mime);
  const file = new File([bytes], `${filenameBase}.${ext}`, { type: mime });
  return file;
}

async function copyText(text: string) {
  const s = String(text || '');
  if (!s) return;

  // Clipboard API needs secure context in many browsers. [web:144]
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(s);
    return;
  }

  // Fallback
  const ta = document.createElement('textarea');
  ta.value = s;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

export default function MenuItemModal({ item, merchantId, onClose, onSuccess }: MenuItemModalProps) {
  const [imageMode, setImageMode] = useState<'upload' | 'link'>(() =>
    item?.image_url ? 'link' : 'upload'
  );

  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    price: Number(item?.price ?? 0),
    category: item?.category || 'Main Course',
    custom_category: '',
    image_url: item?.image_url || '',
    is_available: item?.is_available ?? true,
    is_veg: item?.is_veg ?? true,
    preparation_time: Number((item as any)?.preparation_time ?? 30),
    discount_percentage: Number((item as any)?.discount_percentage ?? 0),
    category_id: (item as any)?.category_id ?? null,
  });

  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Ref for the modal container to attach paste listener
  const modalRef = useRef<HTMLDivElement>(null);

  const resolvedCategory = useMemo(() => {
    if (formData.category === '__custom__') {
      return (formData.custom_category || '').trim() || 'Main Course';
    }
    return formData.category || 'Main Course';
  }, [formData.category, formData.custom_category]);

  const imageOk = useMemo(() => isValidImageSource(formData.image_url), [formData.image_url]);

  const discountOk = useMemo(() => {
    const d = Number(formData.discount_percentage ?? 0);
    return Number.isFinite(d) && d >= 0 && d <= 100;
  }, [formData.discount_percentage]);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'menu-items');
      setFormData((p) => ({ ...p, image_url: url }));
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadDataUrl = useCallback(
    async (dataUrl: string) => {
      const file = dataUrlToFile(dataUrl, 'dataurl-image');
      await uploadFile(file);
    },
    [uploadFile]
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      e.currentTarget.value = ''; // reset
    }
  };

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      // 1) Pasted image file
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          await uploadFile(file);
          return;
        }
      }

      // 2) Pasted text (URL or data URL)
      const text = e.clipboardData?.getData('text/plain')?.trim() || '';
      if (!text) return;

      // If it’s a data URL image → upload it (recommended) and replace image_url
      if (isDataImageUrl(text)) {
        e.preventDefault();
        toast.info('Uploading pasted data image…');
        await uploadDataUrl(text);
        return;
      }

      // If it’s a normal URL → set it (works for “Copy image address”)
      if (isValidHttpUrl(text)) {
        // Only hijack paste when link mode, otherwise let paste behave normally in inputs
        if (imageMode === 'link') {
          e.preventDefault();
          setFormData((p) => ({ ...p, image_url: text }));
          toast.success('Image link pasted');
        }
      }
    },
    [imageMode, uploadDataUrl, uploadFile]
  );

  // Attach paste listener within modal scope
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    const listener = (e: any) => handlePaste(e);
    el.addEventListener('paste', listener);
    return () => el.removeEventListener('paste', listener);
  }, [handlePaste]);

  // Manual "Paste Image" button handler (uses Async Clipboard API)
  const handleManualPasteClick = async () => {
    try {
      // If available, this can read clipboard images (requires permission in many browsers). [web:144]
      if (typeof navigator?.clipboard?.read === 'function') {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const type = item.types.find((t) => t.startsWith('image/'));
          if (type) {
            const blob = await item.getType(type);
            const file = new File([blob], 'pasted-image.png', { type });
            await uploadFile(file);
            return;
          }
        }
        toast.info('No image found in clipboard');
        return;
      }

      toast.error('Clipboard read not supported. Use Ctrl+V instead.');
    } catch (err) {
      console.error(err);
      toast.error('Unable to read clipboard. Try Ctrl+V instead.');
    }
  };

  const removeImage = () => setFormData((p) => ({ ...p, image_url: '' }));

  const handleCopyImageLink = async () => {
    try {
      if (!formData.image_url) return toast.info('No image to copy');
      await copyText(formData.image_url);
      toast.success('Image link copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const price = Number(formData.price ?? 0);
    const prep = Number(formData.preparation_time ?? 0);
    const disc = Number(formData.discount_percentage ?? 0);

    if (!name) return toast.error('Name is required');
    if (!Number.isFinite(price) || price < 0) return toast.error('Invalid price');
    if (!Number.isFinite(prep) || prep < 0) return toast.error('Invalid preparation time');
    if (!discountOk) return toast.error('Discount must be 0 to 100');
    if (!imageOk) return toast.error('Image must be a valid URL or data:image;base64');

    setLoading(true);
    try {
      // If user still has a data URL at submit time, auto-upload it and use the Cloudinary URL
      let finalImageUrl = (formData.image_url || '').trim();
      if (finalImageUrl && isDataImageUrl(finalImageUrl)) {
        toast.info('Uploading image…');
        const file = dataUrlToFile(finalImageUrl, 'menu-item');
        setUploading(true);
        try {
          finalImageUrl = await uploadToCloudinary(file, 'menu-items');
          setFormData((p) => ({ ...p, image_url: finalImageUrl }));
        } finally {
          setUploading(false);
        }
      }

      const payload: any = {
        name,
        description: (formData.description || '').trim(),
        price: Number(price),
        category: resolvedCategory,
        image_url: finalImageUrl || '',
        is_available: Boolean(formData.is_available),
        is_veg: Boolean(formData.is_veg),
        preparation_time: clamp(Number(prep), 0, 10000),
        discount_percentage: clamp(Number(disc), 0, 100),
        category_id: formData.category_id || null,
        updated_at: new Date().toISOString(),
      };

      if (item) {
        await menuService.updateMenuItem(item.id, payload);
        toast.success('Menu item updated successfully');
      } else {
        await menuService.createMenuItem({
          ...payload,
          merchant_id: merchantId,
          created_at: new Date().toISOString(),
        });
        toast.success('Menu item added successfully');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* Attach ref here to capture paste events anywhere in the modal */}
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 sm:px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {item ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Tip: Paste image (Ctrl+V) or paste an image link / data:image;base64.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Image */}
          <div className="rounded-2xl border p-4 bg-gray-50">
            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="block text-sm font-bold text-gray-900">Item Image</label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                    imageMode === 'upload'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('link')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
                    imageMode === 'link'
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  Use Link
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-40">
                {formData.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-xl border bg-white"
                  />
                ) : (
                  <div
                    className="w-full h-40 bg-white rounded-xl flex flex-col items-center justify-center border cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => document.getElementById('image-upload')?.click()}
                  >
                    {imageMode === 'link' ? (
                      <Link2 className="text-gray-400" size={32} />
                    ) : (
                      <Upload className="text-gray-400" size={32} />
                    )}
                    <span className="text-[10px] text-gray-400 mt-2 font-medium">Click or Paste</span>
                  </div>
                )}

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={!formData.image_url}
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyImageLink}
                    disabled={!formData.image_url}
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                    title="Copy image link"
                  >
                    <Copy size={16} />
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {imageMode === 'upload' ? (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploading}
                    />

                    <div className="flex flex-wrap gap-2">
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer inline-flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                      >
                        <Upload size={16} />
                        {uploading ? 'Uploading…' : 'Choose image'}
                      </label>

                      <button
                        type="button"
                        onClick={handleManualPasteClick}
                        disabled={uploading}
                        className="inline-flex items-center gap-2 bg-white text-gray-800 px-4 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                        title="Paste from clipboard"
                      >
                        <Clipboard size={16} />
                        Paste
                      </button>
                    </div>

                    <p className="text-xs text-gray-600 mt-2">
                      Uploads to Cloudinary folder: <span className="font-mono">menu-items</span>.
                      <br />
                      You can also press <strong>Ctrl+V</strong> anywhere in this modal to paste an image,
                      or paste a link / data:image;base64.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData((p) => ({ ...p, image_url: e.target.value }))}
                        placeholder="https://... OR data:image/jpeg;base64,..."
                        className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent ${
                          imageOk ? 'border-gray-300' : 'border-red-400'
                        }`}
                      />
                      {imageOk ? (
                        <CheckCircle2 className="text-green-600 shrink-0" size={18} />
                      ) : (
                        <AlertTriangle className="text-red-600 shrink-0" size={18} />
                      )}
                    </div>

                    {!imageOk && (
                      <p className="text-xs text-red-600 mt-1">
                        Use a valid https/http URL or a data:image/*;base64,... string.
                      </p>
                    )}

                    <p className="text-xs text-gray-600 mt-2">
                      Tip: “Copy image address” → paste here. For data URLs, we auto-upload to Cloudinary on save.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Price & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price (₹) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((p) => ({ ...p, price: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              >
                <option value="Starter">Starter</option>
                <option value="Main Course">Main Course</option>
                <option value="Dessert">Dessert</option>
                <option value="Beverage">Beverage</option>
                <option value="Snack">Snack</option>
                <option value="Combo">Combo</option>
                <option value="__custom__">Custom…</option>
              </select>
            </div>

            {formData.category === '__custom__' && (
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Custom category</label>
                <input
                  type="text"
                  value={formData.custom_category}
                  onChange={(e) => setFormData((p) => ({ ...p, custom_category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g. Tandoor, Rolls, Thali"
                />
              </div>
            )}
          </div>

          {/* Prep time & Discount & Category ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prep time (min)</label>
              <input
                type="number"
                min={0}
                value={formData.preparation_time}
                onChange={(e) => setFormData((p) => ({ ...p, preparation_time: Number(e.target.value) }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.discount_percentage}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, discount_percentage: Number(e.target.value) }))
                }
                className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent ${
                  discountOk ? 'border-gray-300' : 'border-red-400'
                }`}
              />
              {!discountOk && <p className="text-xs text-red-600 mt-1">0 to 100 only</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category ID (optional)</label>
              <input
                type="text"
                value={formData.category_id || ''}
                onChange={(e) => setFormData((p) => ({ ...p, category_id: e.target.value || null }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="UUID or blank"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-xl border px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_veg}
                onChange={(e) => setFormData((p) => ({ ...p, is_veg: e.target.checked }))}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-800 font-semibold">Vegetarian</span>
              <span className="text-xs text-gray-500 ml-auto">Shown as Veg</span>
            </label>

            <label className="flex items-center gap-2 rounded-xl border px-4 py-3 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData((p) => ({ ...p, is_available: e.target.checked }))}
                className="w-5 h-5 text-primary rounded focus:ring-primary"
              />
              <span className="text-gray-800 font-semibold">Available</span>
              <span className="text-xs text-gray-500 ml-auto">Visible to customers</span>
            </label>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-white pt-2 pb-1">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || uploading}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50"
              >
                {loading ? 'Saving…' : item ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
