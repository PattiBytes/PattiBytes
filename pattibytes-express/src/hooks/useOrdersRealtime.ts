/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Opts = {
  enabled: boolean;
  onInsert?: (payload: any) => void;
  onAnyChange?: (payload: any) => void;
};

export function useOrdersRealtime({ enabled, onInsert, onAnyChange }: Opts) {
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to Postgres changes (INSERT/UPDATE/DELETE) [web:212]
    const channel = supabase
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          onAnyChange?.(payload);
          if (payload.eventType === 'INSERT') onInsert?.(payload);
        }
      )
      .subscribe();

    return () => {
      // Cleanup channel [web:239]
      supabase.removeChannel(channel);
    };
  }, [enabled, onInsert, onAnyChange]);
}
