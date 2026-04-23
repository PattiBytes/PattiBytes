'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { RoleCounts } from '../types';

export function useRoleCounts(userId: string | undefined): RoleCounts {
  const [counts, setCounts] = useState<RoleCounts>({
    customers: 0, merchants: 0, drivers: 0, admins: 0, superadmins: 0,
  });

  useEffect(() => {
    if (!userId) return;
    const roles: Array<{ key: keyof RoleCounts; role: string }> = [
      { key: 'customers',   role: 'customer'   },
      { key: 'merchants',   role: 'merchant'   },
      { key: 'drivers',     role: 'driver'     },
      { key: 'admins',      role: 'admin'      },
      { key: 'superadmins', role: 'superadmin' },
    ];

    Promise.all(
      roles.map(async ({ key, role }) => {
        const { count: c } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', role);
        return [key, c ?? 0] as const;
      })
    ).then((results) => {
      const next = {} as RoleCounts;
      for (const [k, v] of results) next[k] = v as number;
      setCounts(next);
    }).catch(() => {/* ignore */});
  }, [userId]);

  return counts;
}
