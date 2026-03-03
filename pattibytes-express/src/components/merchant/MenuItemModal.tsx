/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  useMemo, useState, useEffect, useRef, useCallback,
} from 'react';
import {
  X, Upload, Link2, Trash2,
  CheckCircle2, AlertTriangle, Clipboard, Copy, Loader2, CloudOff,
} from 'lucide-react';
import { toast }              from 'react-toastify';
import { menuService }        from '@/services/menu';
import { MenuItem }           from '@/types';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useMenuItemAutosave } from '@/hooks/useMenuItemAutosave';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface MenuItemModalProps {
  item:       MenuItem | null;
  merchantId: string;
  onClose:    () => void;
  onSuccess:  () => void;
}

interface FormState {
  name:                string;
  description:         string;
  price:               number;
  category:            string;
  custom_category:     string;
  image_url:           string;
  is_available:        boolean;
  is_veg:              boolean;
  preparation_time:    number;
  discount_percentage: number;
  category_id:         string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
function isValidHttpUrl(v: string) {
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}
function isDataImageUrl(v: string) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(v || '').trim());
}
function isValidImageSource(v: string) {
  return !v || isValidHttpUrl(v) || isDataImageUrl(v);
}
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m.includes('png'))  return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif'))  return 'gif';
  return 'jpg';
}
function dataUrlToFile(dataUrl: string, base = 'pasted-image') {
  const match = dataUrl.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const [, mime, b64] = match;
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new File([bytes], `${base}.${extFromMime(mime)}`, { type: mime });
}
async function copyText(text: string) {
  if (!text) return;
  if (navigator?.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text); return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  Object.assign(ta.style, { position: 'fixed', left: '-9999px', top: '-9999px' });
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoSave Badge
// ─────────────────────────────────────────────────────────────────────────────
function AutoSaveBadge({
  saving, savedAt, hasUnsaved,
}: { saving: boolean; savedAt: Date | null; hasUnsaved: boolean }) {
  if (saving) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-semibold animate-pulse">
      <Loader2 size={11} className="animate-spin" /> Saving…
    </span>
  );
  if (hasUnsaved) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">
      <CloudOff size={11} /> Unsaved
    </span>
  );
  if (savedAt) return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-semibold">
      <CheckCircle2 size={11} />
      Saved {savedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ImagePickerSection
// ─────────────────────────────────────────────────────────────────────────────
interface ImagePickerProps {
  imageUrl:   string;
  onChange:   (url: string) => void;
  onAutosave: (url: string) => void;
}

function ImagePickerSection({ imageUrl, onChange, onAutosave }: ImagePickerProps) {
  const [mode,      setMode]      = useState<'upload' | 'link'>(() => imageUrl ? 'link' : 'upload');
  const [uploading, setUploading] = useState(false);

  const doUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'menu-items');
      onChange(url);
      onAutosave(url);
      toast.success('Image uploaded & saved');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [onChange, onAutosave]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { await doUpload(file); e.currentTarget.value = ''; }
  };

  const handleClipboardBtn = async () => {
    try {
      if (typeof navigator?.clipboard?.read === 'function') {
        const items = await navigator.clipboard.read();
        for (const ci of items) {
          const type = ci.types.find(t => t.startsWith('image/'));
          if (type) {
            const blob = await ci.getType(type);
            await doUpload(new File([blob], 'clipboard.png', { type }));
            return;
          }
        }
        toast.info('No image in clipboard');
        return;
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
                mode === m
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
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
              {uploading
                ? <Loader2 className="animate-spin text-primary" size={28} />
                : mode === 'link'
                  ? <Link2 className="text-gray-300" size={28} />
                  : <Upload className="text-gray-300" size={28} />
              }
              <span className="text-[10px] text-gray-400 mt-2 font-semibold">
                {uploading ? 'Uploading…' : 'Click or Ctrl+V'}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button"
              onClick={() => { onChange(''); onAutosave(''); }}
              disabled={!imageUrl}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border bg-white hover:bg-red-50 hover:border-red-300 text-xs font-semibold disabled:opacity-40 transition"
            >
              <Trash2 size={13} /> Remove
            </button>
            <button type="button"
              onClick={async () => { await copyText(imageUrl); if (imageUrl) toast.success('Copied!'); }}
              disabled={!imageUrl}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border bg-white hover:bg-gray-100 text-xs font-semibold disabled:opacity-40 transition"
            >
              <Copy size={13} /> Copy
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          {mode === 'upload' ? (
            <div className="space-y-3">
              <input type="file" accept="image/*" id="menu-img-input"
                className="hidden" disabled={uploading} onChange={handleFileInput}
              />
              <div className="flex flex-wrap gap-2">
                <label htmlFor="menu-img-input"
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-gray-800 font-semibold text-sm cursor-pointer hover:bg-gray-50 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload size={15} />
                  {uploading ? 'Uploading…' : 'Choose file'}
                </label>
                <button type="button" disabled={uploading} onClick={handleClipboardBtn}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition">
                  <Clipboard size={15} /> Paste
                </button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 font-mono text-[10px]">Ctrl+V</kbd>
                {' '}anywhere in this modal to paste a screenshot — uploads & <strong>autosaves</strong> immediately.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="text" value={imageUrl}
                  onChange={e => onChange(e.target.value)}
                  onBlur={e => {
                    const url = e.target.value.trim();
                    if (url && isValidHttpUrl(url)) onAutosave(url);
                  }}
                  placeholder="https://cdn.example.com/img.jpg"
                  className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition ${
                    imageOk ? 'border-gray-300' : 'border-red-400 bg-red-50'
                  }`}
                />
                {imageUrl && (imageOk
                  ? <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                  : <AlertTriangle className="text-red-500 shrink-0" size={18} />
                )}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Modal
// ─────────────────────────────────────────────────────────────────────────────
const IC = 'w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition';
const LC = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function MenuItemModal({ item, merchantId, onClose, onSuccess }: MenuItemModalProps) {
  const {
    autoSaving, savedAt, hasUnsaved,
    schedule, flushNow, seedLastSaved, cancel,
  } = useMenuItemAutosave(item?.id);

  const [form, setForm] = useState<FormState>({
    name:                item?.name                               || '',
    description:         item?.description                        || '',
    price:               Number(item?.price                       ?? 0),
    category:            item?.category                           || 'Main Course',
    custom_category:     '',
    image_url:           item?.image_url                          || '',
    is_available:        item?.is_available                       ?? true,
    is_veg:              item?.is_veg                             ?? true,
    preparation_time:    Number((item as any)?.preparation_time   ?? 30),
    discount_percentage: Number((item as any)?.discount_percentage ?? 0),
    category_id:         (item as any)?.category_id               ?? null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [closing,    setClosing]    = useState(false);  // ✅ flush-then-close guard
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    seedLastSaved(item ? { ...item } : {});
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(p => ({ ...p, [k]: v })), []);

  const resolvedCategory = useMemo(() => {
    if (form.category === '__custom__') return form.custom_category.trim() || 'Main Course';
    return form.category || 'Main Course';
  }, [form.category, form.custom_category]);

  const discountOk = useMemo(() => {
    const d = Number(form.discount_percentage ?? 0);
    return Number.isFinite(d) && d >= 0 && d <= 100;
  }, [form.discount_percentage]);

  // ── Global paste (Ctrl+V anywhere in modal) ───────────────────────────────
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'menu-items');
      set('image_url', url);
      schedule({ image_url: url });
      toast.success('Image uploaded & saved');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally { setUploading(false); }
  }, [set, schedule]);

  const handleModalPaste = useCallback(async (e: ClipboardEvent) => {
    if (e.clipboardData?.files.length) {
      const f = e.clipboardData.files[0];
      if (f.type.startsWith('image/')) { e.preventDefault(); await uploadFile(f); return; }
    }
    const text = e.clipboardData?.getData('text/plain')?.trim() || '';
    if (!text) return;
    if (isDataImageUrl(text)) {
      e.preventDefault();
      toast.info('Uploading pasted image…');
      await uploadFile(dataUrlToFile(text, 'paste'));
      return;
    }
    // Intercept pasted URL only when the focused element is NOT a text input
    if (isValidHttpUrl(text)) {
      const active = document.activeElement;
      const isTyping = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
      if (!isTyping) {
        e.preventDefault();
        set('image_url', text);
        schedule({ image_url: text });
        toast.success('Image link pasted & saved');
      }
    }
  }, [uploadFile, set, schedule]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const h = (e: Event) => handleModalPaste(e as ClipboardEvent);
    el.addEventListener('paste', h);
    return () => el.removeEventListener('paste', h);
  }, [handleModalPaste]);

  // ── Safe close — flush any pending autosave first ─────────────────────────
  // ✅ This is the key fix: pressing Cancel/X will await any queued save
  //    before closing, so no data is ever lost.
  const handleClose = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    try {
      await flushNow(); // no-op if nothing pending
    } finally {
      setClosing(false);
      onClose();
    }
  }, [closing, flushNow, onClose]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name  = form.name.trim();
    const price = Number(form.price  ?? 0);
    const prep  = Number(form.preparation_time  ?? 0);
    const disc  = Number(form.discount_percentage ?? 0);

    if (!name)                               return toast.error('Name is required');
    if (!Number.isFinite(price) || price < 0) return toast.error('Invalid price');
    if (!Number.isFinite(prep)  || prep  < 0) return toast.error('Invalid prep time');
    if (!discountOk)                         return toast.error('Discount must be 0–100');
    if (!isValidImageSource(form.image_url)) return toast.error('Invalid image URL');

    setSubmitting(true);
    try {
      let finalImg = form.image_url.trim();
      if (finalImg && isDataImageUrl(finalImg)) {
        toast.info('Uploading image…');
        setUploading(true);
        try {
          finalImg = await uploadToCloudinary(dataUrlToFile(finalImg, 'menu-item'), 'menu-items');
          set('image_url', finalImg);
        } finally { setUploading(false); }
      }

      const payload: any = {
        name,
        description:         form.description.trim(),
        price:               Number(price),
        category:            resolvedCategory,
        image_url:           finalImg || '',
        is_available:        Boolean(form.is_available),
        is_veg:              Boolean(form.is_veg),
        preparation_time:    clamp(Number(prep), 0, 10_000),
        discount_percentage: clamp(Number(disc), 0, 100),
        category_id:         form.category_id || null,
        updated_at:          new Date().toISOString(),
      };

      if (item) {
        await menuService.updateMenuItem(item.id, payload);
        toast.success('Menu item updated');
      } else {
        await menuService.createMenuItem({ ...payload, merchant_id: merchantId, created_at: new Date().toISOString() });
        toast.success('Menu item added');
      }
      cancel(); // clear any pending autosave queue
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">
                {item ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              {item && (
                <AutoSaveBadge saving={autoSaving} savedAt={savedAt} hasUnsaved={hasUnsaved} />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {item
                ? 'Changes autosave in background — even after clicking Cancel'
                : 'Fill in details and click Add Item to save'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={closing}
            className="shrink-0 text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition disabled:opacity-50"
          >
            {closing ? <Loader2 size={20} className="animate-spin" /> : <X size={20} />}
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

            <ImagePickerSection
              imageUrl={form.image_url}
              onChange={url => set('image_url', url)}
              onAutosave={url => schedule({ image_url: url })}
            />

            {/* Name */}
            <div>
              <label className={LC}>Item Name *</label>
              <input type="text" required value={form.name}
                placeholder="e.g. Butter Chicken"
                onChange={e => set('name', e.target.value)}
                onBlur={() => { const v = form.name.trim(); if (v) schedule({ name: v }); }}
                className={IC}
              />
            </div>

            {/* Description */}
            <div>
              <label className={LC}>Description</label>
              <textarea rows={3} value={form.description}
                placeholder="Short description shown to customers"
                onChange={e => set('description', e.target.value)}
                onBlur={() => schedule({ description: form.description.trim() })}
                className={IC}
              />
            </div>

            {/* Price + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LC}>Price (₹) *</label>
                <input type="number" min={0} step="0.01" required value={form.price}
                  onChange={e => set('price', Number(e.target.value))}
                  onBlur={() => schedule({ price: Number(form.price || 0) })}
                  className={IC}
                />
              </div>
              <div>
                <label className={LC}>Category *</label>
                <select required value={form.category} className={IC}
                  onChange={e => {
                    set('category', e.target.value);
                    if (e.target.value !== '__custom__') schedule({ category: e.target.value });
                  }}>
                  {['Starter','Main Course','Dessert','Beverage','Snack','Combo'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
              </div>
              {form.category === '__custom__' && (
                <div className="sm:col-span-2">
                  <label className={LC}>Custom category name</label>
                  <input type="text" value={form.custom_category} placeholder="e.g. Tandoor, Rolls"
                    onChange={e => set('custom_category', e.target.value)}
                    onBlur={() => schedule({ category: form.custom_category.trim() || 'Main Course' })}
                    className={IC}
                  />
                </div>
              )}
            </div>

            {/* Prep / Discount / Category ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={LC}>Prep time (min)</label>
                <input type="number" min={0} value={form.preparation_time}
                  onChange={e => set('preparation_time', Number(e.target.value))}
                  onBlur={() => schedule({ preparation_time: Number(form.preparation_time || 0) })}
                  className={IC}
                />
              </div>
              <div>
                <label className={LC}>Discount (%)</label>
                <input type="number" min={0} max={100} value={form.discount_percentage}
                  onChange={e => set('discount_percentage', Number(e.target.value))}
                  onBlur={() => { if (discountOk) schedule({ discount_percentage: Number(form.discount_percentage || 0) }); }}
                  className={`${IC} ${discountOk ? '' : '!border-red-400 bg-red-50'}`}
                />
                {!discountOk && <p className="text-xs text-red-600 mt-1">Must be 0–100</p>}
              </div>
              <div>
                <label className={LC}>Category ID</label>
                <input type="text" value={form.category_id || ''} placeholder="UUID or blank"
                  onChange={e => set('category_id', e.target.value || null)}
                  onBlur={() => schedule({ category_id: form.category_id || null })}
                  className={IC}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'is_veg'       as const, label: 'Vegetarian', sub: 'Shown as Veg' },
                { key: 'is_available' as const, label: 'Available',  sub: 'Visible to customers' },
              ]).map(({ key, label, sub }) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
                  <input type="checkbox" checked={Boolean(form[key])}
                    onChange={e => { set(key, e.target.checked); schedule({ [key]: e.target.checked }); }}
                    className="w-5 h-5 text-primary rounded focus:ring-primary"
                  />
                  <span className="font-semibold text-gray-800 text-sm">{label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{sub}</span>
                </label>
              ))}
            </div>

            {/* ── Footer actions ── */}
            <div className="sticky bottom-0 bg-white pt-3 pb-1 border-t border-gray-100 -mx-5 sm:-mx-6 px-5 sm:px-6">
              <div className="flex gap-3">
                <button type="button" onClick={handleClose} disabled={closing}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {closing && <Loader2 size={15} className="animate-spin" />}
                  {closing ? 'Saving…' : 'Cancel'}
                </button>
                <button type="submit" disabled={submitting || uploading || closing}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50 transition flex items-center justify-center gap-2">
                  {(submitting || uploading) && <Loader2 size={15} className="animate-spin" />}
                  {submitting ? 'Saving…' : uploading ? 'Uploading…' : item ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
