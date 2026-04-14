'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import type { ProfileRow, MerchantRow, UserWithMerchant } from '../types';
import { PER_PAGE } from '../types';

export function useUsersData(
  userId: string | undefined,
  roleFilter: string,
  debouncedQuery: string,
  page: number
) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UserWithMerchant[]>([]);
  const [count, setCount] = useState(0);

  const loadUsers = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') query = query.eq('role', roleFilter);

      const q = debouncedQuery.trim();
      if (q) {
        query = query.or(
          `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
        );
      }

      const from = (page - 1) * PER_PAGE;
      const { data, error, count: total } = await query.range(from, from + PER_PAGE - 1);
      if (error) throw error;

      const profiles = (data as ProfileRow[]) || [];

      // ── Enrich with merchant data for merchant-role profiles ──
      const merchantUserIds = profiles
        .filter((p) => p.role === 'merchant')
        .map((p) => p.id);

      let merchantMap: Record<string, MerchantRow> = {};
      if (merchantUserIds.length > 0) {
        const { data: merchants } = await supabase
          .from('merchants')
          .select(
            'id,user_id,business_name,business_type,logo_url,phone,email,' +
            'is_active,is_verified,average_rating,total_reviews,total_orders,' +
            'city,state,commission_rate,created_at'
          )
          .in('user_id', merchantUserIds);

        if (merchants) {
          merchantMap = (merchants as unknown as MerchantRow[]).reduce(
            (acc, m) => ({ ...acc, [m.user_id]: m }),
            {}
          );
        }
      }

      setRows(profiles.map((p) => ({ ...p, merchant: merchantMap[p.id] ?? null })));
      setCount(total || 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [userId, roleFilter, debouncedQuery, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return { loading, rows, count, loadUsers };
}