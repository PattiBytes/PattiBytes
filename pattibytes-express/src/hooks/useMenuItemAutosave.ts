/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { menuService } from '@/services/menu';

const DEBOUNCE_MS  = 400;
const GUARD_MS     = 12_000;   // force-unlock if save hangs > 12 s
const MAX_RETRIES  = 4;

export interface AutosaveHandle {
  autoSaving:    boolean;
  savedAt:       Date | null;
  hasUnsaved:    boolean;          // ✅ true when there's a pending unwritten change
  schedule:      (patch: Record<string, any>) => void;
  flushNow:      () => Promise<void>; // ✅ immediate save — call before close
  seedLastSaved: (data: Record<string, any>) => void;
  cancel:        () => void;
}

export function useMenuItemAutosave(
  itemId: string | null | undefined,
): AutosaveHandle {
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedAt,    setSavedAt]    = useState<Date | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const lastSavedRef  = useRef<Record<string, any>>({});
  const pendingRef    = useRef<Record<string, any> | null>(null);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guardRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef     = useRef(false);
  const retryCountRef = useRef(0);
  const itemIdRef     = useRef(itemId);

  useEffect(() => { itemIdRef.current = itemId; }, [itemId]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (guardRef.current) clearTimeout(guardRef.current);
    timerRef.current = guardRef.current = null;
  }, []);

  // ── Core save executor ────────────────────────────────────────────────────
  const executeSave = useCallback(async () => {
    const id = itemIdRef.current;
    if (!id || !pendingRef.current) return;
    if (savingRef.current) return; // already in-flight; retry queued via retryRef

    // Snapshot & clear pending
    const raw          = { ...pendingRef.current };
    pendingRef.current = null;
    setHasUnsaved(false);

    // Diff — only send changed fields
    const toSend: Record<string, any> = {};
    for (const k of Object.keys(raw)) {
      if (raw[k] !== lastSavedRef.current[k]) toSend[k] = raw[k];
    }
    if (Object.keys(toSend).length === 0) return;

    savingRef.current = true;
    setAutoSaving(true);

    // Safety guard: never get permanently stuck in "Saving…"
    guardRef.current = setTimeout(() => {
      savingRef.current = false;
      setAutoSaving(false);
    }, GUARD_MS);

    try {
      await menuService.updateMenuItem(id, {
        ...toSend,
        updated_at: new Date().toISOString(),
      });

      lastSavedRef.current = { ...lastSavedRef.current, ...toSend };
      retryCountRef.current = 0;
      setSavedAt(new Date());
    } catch (err) {
      console.error('[Autosave] failed:', err);

      // Re-queue failed changes so they're retried on next keypress / flushNow
      pendingRef.current = { ...(pendingRef.current ?? {}), ...toSend };
      setHasUnsaved(true);

      // Exponential back-off retry (up to MAX_RETRIES)
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const backoff = Math.min(2000 * retryCountRef.current, 8000);
        timerRef.current = setTimeout(executeSave, backoff);
      } else {
        console.warn('[Autosave] max retries reached — will retry on next user change');
        retryCountRef.current = 0;
      }
    } finally {
      if (guardRef.current) clearTimeout(guardRef.current);
      guardRef.current  = null;
      savingRef.current = false;
      setAutoSaving(false);

      // If more changes queued while saving, schedule another pass
      if (pendingRef.current) {
        timerRef.current = setTimeout(executeSave, DEBOUNCE_MS);
      }
    }
  }, []);

  // ── Schedule (debounced) ──────────────────────────────────────────────────
  const schedule = useCallback((patch: Record<string, any>) => {
    if (!itemIdRef.current) return;

    pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
    setHasUnsaved(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (savingRef.current) return; // executeSave's finally will re-schedule

    timerRef.current = setTimeout(executeSave, DEBOUNCE_MS);
  }, [executeSave]);

  // ── flushNow — call before closing modal ─────────────────────────────────
  // ✅ Clears the debounce timer and saves immediately.
  // Returns a promise so the caller can await it if needed.
  const flushNow = useCallback(async () => {
    if (!pendingRef.current) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    await executeSave();
  }, [executeSave]);

  const seedLastSaved = useCallback((data: Record<string, any>) => {
    lastSavedRef.current  = { ...data };
    pendingRef.current    = null;
    retryCountRef.current = 0;
    setHasUnsaved(false);
    setSavedAt(null);
  }, []);

  const cancel = useCallback(() => {
    clearTimers();
    pendingRef.current    = null;
    retryCountRef.current = 0;
    setHasUnsaved(false);
  }, [clearTimers]);

  // ✅ Flush on unmount — ensures saves aren't lost when modal closes
  useEffect(() => {
    return () => {
      clearTimers();
      // Fire-and-forget on unmount (best effort)
      if (pendingRef.current && itemIdRef.current) executeSave();
    };
  }, [clearTimers, executeSave]);

  return { autoSaving, savedAt, hasUnsaved, schedule, flushNow, seedLastSaved, cancel };
}
