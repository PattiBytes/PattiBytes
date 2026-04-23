import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface AdminPreferences {
  auto_reload_enabled  : boolean;
  auto_reload_interval : number;   // seconds
}

const DEFAULTS: AdminPreferences = {
  auto_reload_enabled  : false,
  auto_reload_interval : 30,
};

export function useAdminPreferences() {
  const [prefs,    setPrefs]    = useState<AdminPreferences>(DEFAULTS);
  const [loading,  setLoading]  = useState(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load once ────────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('id, admin_preferences')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setSettingsId(data.id);
          const saved = (data.admin_preferences ?? {}) as Partial<AdminPreferences>;
          setPrefs({ ...DEFAULTS, ...saved });
        }
      } catch (e) {
        console.warn('[AdminPrefs] load failed — using defaults:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Debounced save ────────────────────────────────────────────────────────
  const persist = useCallback((next: AdminPreferences, id: string | null) => {
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from('app_settings')
        .update({ admin_preferences: next })
        .eq('id', id);
      if (error) console.error('[AdminPrefs] save failed:', error.message);
      else console.log('[AdminPrefs] ✅ saved');
    }, 800); // debounce — don't hammer DB on slider drag
  }, []);

  const updatePrefs = useCallback((patch: Partial<AdminPreferences>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch };
      persist(next, settingsId);
      return next;
    });
  }, [persist, settingsId]);

  return { prefs, loading, updatePrefs };
}


