/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { menuService } from '@/services/menu';

const DEBOUNCE_MS  = 400;
const GUARD_MS     = 12_000;
const MAX_RETRIES  = 4;

export interface AutosaveHandle {
  autoSaving:    boolean;
  savedAt:       Date | null;
  hasUnsaved:    boolean;
  schedule:      (patch: Record<string, any>) => void;
  flushNow:      () => Promise<void>;
  seedLastSaved: (data: Record<string, any>) => void;
  cancel:        () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep equality — handles objects/arrays (e.g. dish_timing jsonb).
// Falls back to JSON.stringify so we don't send unchanged objects.
// ─────────────────────────────────────────────────────────────────────────────
function isEqual(a: any, b: any): boolean {
  if (a === b) return true;
  // Primitives that are !== are simply not equal
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (a === null || b === null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract a readable message from any thrown value.
// Supabase PostgrestError has a `message` property but its other fields
// (details, hint, code) are non-enumerable, so `console.error(err)` prints {}.
// ─────────────────────────────────────────────────────────────────────────────
function extractErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  // Supabase PostgrestError
  if (err?.message) return `${err.message}${err.details ? ` — ${err.details}` : ''}`;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// ─────────────────────────────────────────────────────────────────────────────
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
    if (savingRef.current) return; // already in-flight; finally block re-schedules

    const raw          = { ...pendingRef.current };
    pendingRef.current = null;
    setHasUnsaved(false);

    // ── Diff: only send fields that actually changed ───────────────────────
    // Uses deep equality so that object fields (e.g. dish_timing jsonb)
    // are NOT re-sent when their content is unchanged.
    const toSend: Record<string, any> = {};
    for (const k of Object.keys(raw)) {
      if (!isEqual(raw[k], lastSavedRef.current[k])) {
        toSend[k] = raw[k];
      }
    }
    if (Object.keys(toSend).length === 0) return; // nothing actually changed

    savingRef.current = true;
    setAutoSaving(true);

    // Safety guard: never stay stuck in "Saving…" if the network hangs
    guardRef.current = setTimeout(() => {
      savingRef.current = false;
      setAutoSaving(false);
    }, GUARD_MS);

    try {
      await menuService.updateMenuItem(id, {
        ...toSend,
        updated_at: new Date().toISOString(),
      });

      // Merge saved fields into baseline so future diffs are correct
      lastSavedRef.current  = { ...lastSavedRef.current, ...toSend };
      retryCountRef.current = 0;
      setSavedAt(new Date());
    } catch (err: any) {
      // ── Readable error log ──────────────────────────────────────────────
      // Supabase PostgrestError serialises as {} with plain console.error(err)
      // because its properties (message, code, details) are non-enumerable.
      const msg = extractErrorMessage(err);
      console.error('[Autosave] failed:', msg);
      console.error('[Autosave] fields attempted:', Object.keys(toSend));

      // Re-queue so the failed changes survive and retry
      pendingRef.current = { ...(pendingRef.current ?? {}), ...toSend };
      setHasUnsaved(true);

      // Exponential back-off (400 ms → 800 ms → 1600 ms … capped at 8 s)
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++;
        const backoff = Math.min(DEBOUNCE_MS * Math.pow(2, retryCountRef.current), 8_000);
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

      // If more changes were queued while this save was in-flight, flush them
      if (pendingRef.current) {
        timerRef.current = setTimeout(executeSave, DEBOUNCE_MS);
      }
    }
  }, []); // stable — reads everything through refs

  // ── Schedule (debounced) ──────────────────────────────────────────────────
  const schedule = useCallback((patch: Record<string, any>) => {
    if (!itemIdRef.current) return; // new item — no id yet, nothing to autosave

    pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
    setHasUnsaved(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (savingRef.current) return; // executeSave's finally will re-schedule

    timerRef.current = setTimeout(executeSave, DEBOUNCE_MS);
  }, [executeSave]);

  // ── flushNow — await before closing the modal ─────────────────────────────
  const flushNow = useCallback(async () => {
    if (!pendingRef.current) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    await executeSave();
  }, [executeSave]);

  // ── seedLastSaved — call when modal opens with existing item ──────────────
  const seedLastSaved = useCallback((data: Record<string, any>) => {
    lastSavedRef.current  = { ...data };
    pendingRef.current    = null;
    retryCountRef.current = 0;
    setHasUnsaved(false);
    setSavedAt(null);
  }, []);

  // ── cancel — call when modal finishes saving and closes ───────────────────
  const cancel = useCallback(() => {
    clearTimers();
    pendingRef.current    = null;
    retryCountRef.current = 0;
    setHasUnsaved(false);
  }, [clearTimers]);

  // ── Flush on unmount (best-effort fire-and-forget) ────────────────────────
  useEffect(() => {
    return () => {
      clearTimers();
      if (pendingRef.current && itemIdRef.current) void executeSave();
    };
  }, [clearTimers, executeSave]);

  return { autoSaving, savedAt, hasUnsaved, schedule, flushNow, seedLastSaved, cancel };
}

