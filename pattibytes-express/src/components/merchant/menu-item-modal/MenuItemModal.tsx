/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast }               from 'react-toastify';
import { menuService }         from '@/services/menu';
import { uploadToSupabase } from '@/lib/storage';
import { useMenuItemAutosave } from '@/hooks/useMenuItemAutosave';

import { DEFAULT_TIMING, FormState, MenuItemModalProps } from './types';
import {
  clamp,
  dataUrlToFile,
  isDataImageUrl,
  isValidHttpUrl,
  isValidImageSource,
} from './helpers';
import { ImagePickerSection }  from './ImagePickerSection';
import { ModalHeader }         from './ModalHeader';
import { ModalFooter }         from './ModalFooter';
import { BasicInfoFields }     from './fields/BasicInfoFields';
import { PriceCategoryFields } from './fields/PriceCategoryFields';
import { MetaFields }          from './fields/MetaFields';
import { ToggleFields }        from './fields/ToggleFields';
import { TimingFields }        from './fields/TimingFields';

// ─────────────────────────────────────────────────────────────────────────────
export default function MenuItemModal({
  item,
  merchantId,
  onClose,
  onSuccess,
  availableCategories,
}: MenuItemModalProps) {

  const {
    autoSaving, savedAt, hasUnsaved,
    schedule, flushNow, seedLastSaved, cancel,
  } = useMenuItemAutosave(item?.id);

  // ── Form initialisation ───────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    name:                item?.name                                || '',
    description:         item?.description                         || '',
    price:               Number(item?.price                        ?? 0),
    category:            item?.category                            || 'Main Course',
    custom_category:     '',
    image_url:           item?.image_url                           || '',
    is_available:        item?.is_available                        ?? true,
    is_veg:              item?.is_veg                              ?? true,
    preparation_time:    Number((item as any)?.preparation_time    ?? 30),
    discount_percentage: Number((item as any)?.discount_percentage ?? 0),
    category_id:         (item as any)?.category_id                ?? null,
    // dish_timing column — falls back to DEFAULT_TIMING for new items
    timing:              (item as any)?.dish_timing                ?? DEFAULT_TIMING,
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [closing,    setClosing]    = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // ── Seed autosave with the db state when opening an existing item ─────────
  useEffect(() => {
    seedLastSaved(item ? { ...item } : {});
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  // ── Generic setter ────────────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(k: K, v: FormState[K]) =>
      setForm(p => ({ ...p, [k]: v })),
    [],
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const resolvedCategory = useMemo(() => {
    if (form.category === '__custom__') return form.custom_category.trim() || 'Main Course';
    return form.category || 'Main Course';
  }, [form.category, form.custom_category]);

  const discountOk = useMemo(() => {
    const d = Number(form.discount_percentage ?? 0);
    return Number.isFinite(d) && d >= 0 && d <= 100;
  }, [form.discount_percentage]);

  // ── Global paste (Ctrl+V anywhere in modal) ────────────────────────────────
  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
     const url = await uploadToSupabase(file, 'menu-items');
      set('image_url', url);
      schedule({ image_url: url });
      toast.success('Image uploaded & saved');
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }, [set, schedule]);

  const handleModalPaste = useCallback(async (e: ClipboardEvent) => {
    if (e.clipboardData?.files.length) {
      const f = e.clipboardData.files[0];
      if (f.type.startsWith('image/')) {
        e.preventDefault();
        await uploadFile(f);
        return;
      }
    }
    const text = e.clipboardData?.getData('text/plain')?.trim() || '';
    if (!text) return;
    if (isDataImageUrl(text)) {
      e.preventDefault();
      toast.info('Uploading pasted image…');
      await uploadFile(dataUrlToFile(text, 'paste'));
      return;
    }
    if (isValidHttpUrl(text)) {
      const active = document.activeElement;
      const isTyping =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;
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
  const handleClose = useCallback(async () => {
    if (closing) return;
    setClosing(true);
    try {
      await flushNow();
    } finally {
      setClosing(false);
      onClose();
    }
  }, [closing, flushNow, onClose]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name  = form.name.trim();
    const price = Number(form.price            ?? 0);
    const prep  = Number(form.preparation_time ?? 0);
    const disc  = Number(form.discount_percentage ?? 0);

    if (!name)                                 return toast.error('Name is required');
    if (!Number.isFinite(price) || price < 0)  return toast.error('Invalid price');
    if (!Number.isFinite(prep)  || prep  < 0)  return toast.error('Invalid prep time');
    if (!discountOk)                           return toast.error('Discount must be 0–100');
    if (!isValidImageSource(form.image_url))   return toast.error('Invalid image URL');

    // Validate timing slots
    if (form.timing.enabled && form.timing.type === 'scheduled') {
      for (const slot of form.timing.slots) {
        if (slot.days.length === 0) return toast.error('Each timing slot needs at least one day selected');
        if (slot.from >= slot.to)   return toast.error(`Slot time invalid: "To" must be later than "From"`);
      }
    }

    setSubmitting(true);
    try {
      // Upload inline data-URL images before saving
      let finalImg = form.image_url.trim();
      if (finalImg && isDataImageUrl(finalImg)) {
        toast.info('Uploading image…');
        setUploading(true);
        try {
          finalImg = await uploadToSupabase(
            dataUrlToFile(finalImg, 'menu-item'),
            'menu-items',
          );
          set('image_url', finalImg);
        } finally {
          setUploading(false);
        }
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
        dish_timing:         form.timing.enabled ? form.timing : null, // null = no restriction
        updated_at:          new Date().toISOString(),
      };

      if (item) {
        await menuService.updateMenuItem(item.id, payload);
        toast.success('Menu item updated');
      } else {
        await menuService.createMenuItem({
          ...payload,
          merchant_id: merchantId,
          created_at:  new Date().toISOString(),
        });
        toast.success('Menu item added');
      }

      cancel();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl"
      >

        <ModalHeader
          item={item}
          autoSaving={autoSaving}
          savedAt={savedAt}
          hasUnsaved={hasUnsaved}
          closing={closing}
          onClose={handleClose}
        />

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">

            {/* 1 · Image */}
            <ImagePickerSection
              imageUrl={form.image_url}
              onChange={url => set('image_url', url)}
              onAutosave={url => schedule({ image_url: url })}
            />

            {/* 2 · Name + Description */}
            <BasicInfoFields
              form={form}
              onChange={(k, v) => set(k, v)}
              onAutosave={schedule}
            />

            {/* 3 · Price + Category */}
            <PriceCategoryFields
              form={form}
              availableCategories={availableCategories}
              onChange={(k, v) => set(k, v as any)}
              onAutosave={schedule}
            />

            {/* 4 · Prep time + Discount + Category ID */}
            <MetaFields
              form={form}
              discountOk={discountOk}
              onChange={(k, v) => set(k, v as any)}
              onAutosave={schedule}
            />

            {/* 5 · Veg + Available toggles */}
            <ToggleFields
              form={form}
              onChange={(k, v) => set(k, v)}
              onAutosave={schedule}
            />

            {/* 6 · Availability schedule (dish_timing) ✨ NEW */}
            <TimingFields
              timing={form.timing}
              onChange={timing => set('timing', timing)}
              onAutosave={schedule}
            />

            {/* 7 · Footer buttons (sticky) */}
            <ModalFooter
              item={item}
              submitting={submitting}
              uploading={uploading}
              closing={closing}
              onClose={handleClose}
            />

          </form>
        </div>

      </div>
    </div>
  );
}

