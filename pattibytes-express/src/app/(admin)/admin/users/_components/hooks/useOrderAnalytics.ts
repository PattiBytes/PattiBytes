'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { OrderAnalytics } from '../types';

const EMPTY: OrderAnalytics = {
  totalRevenue: 0, totalOrders: 0, pendingOrders: 0,
  completedOrders: 0, cancelledOrders: 0, avgOrderValue: 0,
  todayOrders: 0, todayRevenue: 0,
};

export function useOrderAnalytics(userId: string | undefined) {
  const [analytics, setAnalytics] = useState<OrderAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        setLoading(true);

        // Fetch all orders (only lightweight columns needed)
        const { data } = await supabase
          .from('orders')
          .select('id,status,total_amount,payment_status,created_at');

        if (!data) return;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const DONE = ['delivered', 'completed'];

        const totalOrders     = data.length;
        const pendingOrders   = data.filter((o) => o.status === 'pending').length;
        const completedOrders = data.filter((o) => DONE.includes(o.status)).length;
        const cancelledOrders = data.filter((o) => o.status === 'cancelled').length;

        const totalRevenue = data
          .filter((o) => DONE.includes(o.status))
          .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

        const todayOrders = data.filter(
          (o) => new Date(o.created_at) >= todayStart
        ).length;

        const todayRevenue = data
          .filter((o) => DONE.includes(o.status) && new Date(o.created_at) >= todayStart)
          .reduce((s, o) => s + (Number(o.total_amount) || 0), 0);

        setAnalytics({
          totalRevenue,
          totalOrders,
          pendingOrders,
          completedOrders,
          cancelledOrders,
          avgOrderValue: completedOrders > 0 ? totalRevenue / completedOrders : 0,
          todayOrders,
          todayRevenue,
        });
      } catch {/* ignore */} finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  return { analytics, analyticsLoading: loading };
}