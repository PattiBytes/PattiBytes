'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { initOneSignal, loginOneSignal, logoutOneSignal } from '@/lib/onesignal';

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const prevUidRef = useRef<string | null>(null);

  // ✅ Pre-warm init on mount — loginOneSignal will await this same promise,
  // so there's no double-init. On localhost this resolves to false immediately.
  useEffect(() => {
    initOneSignal();
  }, []);

  // ✅ Safe to call loginOneSignal here — it awaits init internally
  useEffect(() => {
    if (loading) return;

    if (user?.id && user.id !== prevUidRef.current) {
      prevUidRef.current = user.id;
      // Fire-and-forget — login awaits init, so order doesn't matter
      loginOneSignal(user.id, user.role ?? 'customer');
    }

    if (!user && prevUidRef.current) {
      prevUidRef.current = null;
      logoutOneSignal();
    }
  }, [user, loading]);

  return <>{children}</>;
}
