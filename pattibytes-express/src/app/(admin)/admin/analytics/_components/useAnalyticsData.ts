/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(admin)/admin/analytics/_components/useAnalyticsData.ts
'use client';

import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  calcGrowthPercent,
  computeOrderMetrics,
  netRevenueOfOrder,
} from '@/lib/analyticsKit';
import type { AnalyticsData, TimeRange } from './types';
import { EMPTY_ANALYTICS } from './types';

// Columns we need from orders — typed for clarity
const ORDER_COLS = [
  'id', 'total_amount', 'subtotal', 'delivery_fee', 'tax', 'discount',
  'status', 'payment_method', 'order_type', 'created_at',
  'merchant_id', 'driver_id', 'preparation_time', 'delivery_distance_km', 'items',
].join(',');

export function useAnalyticsData(timeRange: TimeRange) {
  const [data, setData] = useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const MS = { week: 7, month: 30, year: 365 };
      const startDate = new Date(now.getTime() - MS[timeRange] * 86_400_000);
      const prevStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

      // ── Fire all independent queries in parallel ────────────────
      const [
        { count: usersCount },
        { count: merchantsCount },
        { count: driversCount },
        { count: activeUsersCount },
        { data: orders, error: ordErr },
        { data: prevOrders },
        { data: newUserRows },
        { data: notifRows },
        { data: reviewRows },
        { data: cancelRows },
        { data: customRows },
        { count: pendingAccessCount },
        { count: pendingCustomCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('merchants').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'driver'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),

        supabase.from('orders').select(ORDER_COLS).gte('created_at', startDate.toISOString()),
        supabase.from('orders').select('total_amount,status').gte('created_at', prevStart.toISOString()).lt('created_at', startDate.toISOString()),

        supabase.from('profiles').select('created_at,role').gte('created_at', startDate.toISOString()),
        supabase.from('notifications').select('type,is_read,sent_push,created_at').gte('created_at', startDate.toISOString()),
        supabase.from('reviews').select('overall_rating,food_rating,delivery_rating,merchant_rating,rating,created_at').gte('created_at', startDate.toISOString()),
        supabase.from('order_cancellations').select('reason,cancelled_at').gte('cancelled_at', startDate.toISOString()),
        supabase.from('custom_order_requests').select('category,status,total_amount,created_at').gte('created_at', startDate.toISOString()),
        supabase.from('access_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('custom_order_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      if (ordErr) throw ordErr;

      const list = (orders as any[]) ?? [];
      const prevList = (prevOrders as any[]) ?? [];

      // ── Core metrics ──────────────────────────────────────────
      const m = computeOrderMetrics(list);
      const prevRev = prevList.reduce((s: number, o: any) => s + netRevenueOfOrder(o), 0);
      const prevOrderCount = prevList.length;
      const revenueGrowth = calcGrowthPercent(m.totalRevenueNet, prevRev);
      const orderGrowth = calcGrowthPercent(list.length, prevOrderCount);

      // ── Revenue breakdown ────────────────────────────────────
      const breakdown = list.reduce(
        (acc: typeof EMPTY_ANALYTICS['breakdown'], o: any) => ({
          subtotal: acc.subtotal + Number(o.subtotal || 0),
          deliveryFee: acc.deliveryFee + Number(o.delivery_fee || 0),
          tax: acc.tax + Number(o.tax || 0),
          discount: acc.discount + Number(o.discount || 0),
        }),
        { subtotal: 0, deliveryFee: 0, tax: 0, discount: 0 }
      );

      // ── Order status ─────────────────────────────────────────
      const statusOf = (s: string) => String(s || '').toLowerCase();
      const PROCESSING = new Set(['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way']);
      const ordersByStatus = {
        pending:    list.filter((o: any) => statusOf(o.status) === 'pending').length,
        processing: list.filter((o: any) => PROCESSING.has(statusOf(o.status))).length,
        delivered:  list.filter((o: any) => statusOf(o.status) === 'delivered').length,
        cancelled:  list.filter((o: any) => statusOf(o.status) === 'cancelled').length,
      };
      const delivered = ordersByStatus.delivered;
      const fulfillmentRate = list.length > 0 ? (delivered / list.length) * 100 : 0;
      const cancellationRate = list.length > 0 ? (ordersByStatus.cancelled / list.length) * 100 : 0;

      // ── Avg times / distances ─────────────────────────────────
      const prepTimes = list.filter((o: any) => Number(o.preparation_time) > 0).map((o: any) => Number(o.preparation_time));
      const avgPrepTime = prepTimes.length ? prepTimes.reduce((a: number, b: number) => a + b, 0) / prepTimes.length : 0;
      const distances = list.filter((o: any) => Number(o.delivery_distance_km) > 0).map((o: any) => Number(o.delivery_distance_km));
      const avgDeliveryDistance = distances.length ? distances.reduce((a: number, b: number) => a + b, 0) / distances.length : 0;

      // ── Payment methods ──────────────────────────────────────
      const payMap = new Map<string, { count: number; amount: number }>();
      for (const o of list) {
        const k = String(o.payment_method || 'unknown').toUpperCase();
        const c = payMap.get(k) || { count: 0, amount: 0 };
        c.count++;
        c.amount += Number(o.total_amount || 0);
        payMap.set(k, c);
      }
      const ordersByPayment = Array.from(payMap.entries()).map(([method, v]) => ({ method, ...v }));

      // ── Order types ──────────────────────────────────────────
      const typeMap = new Map<string, number>();
      for (const o of list) {
        const t = String(o.order_type || 'restaurant');
        typeMap.set(t, (typeMap.get(t) || 0) + 1);
      }
      const ordersByType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

      // ── Veg / Non-veg from items JSONB ────────────────────────
      let vegCount = 0, nonVegCount = 0;
      for (const o of list) {
        try {
          const items = Array.isArray(o.items) ? o.items : JSON.parse(o.items || '[]');
          for (const item of items) {
            const qty = Number(item.quantity || 1);
            if (item.is_veg === true) vegCount += qty;
            else if (item.is_veg === false) nonVegCount += qty;
          }
        } catch { /* skip */ }
      }

      // ── Hourly distribution ───────────────────────────────────
      const hourMap = new Map<number, number>();
      for (let h = 0; h < 24; h++) hourMap.set(h, 0);
      for (const o of list) {
        const h = new Date(o.created_at).getHours();
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      }
      const ordersByHour = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count }));

      // ── Revenue by day ────────────────────────────────────────
      const dayMap = new Map<string, { revenue: number; orders: number }>();
      for (const o of list) {
        const day = String(o.created_at).slice(0, 10);
        const c = dayMap.get(day) || { revenue: 0, orders: 0 };
        c.revenue += netRevenueOfOrder(o);
        c.orders++;
        dayMap.set(day, c);
      }
      const revenueByDay = Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, v]) => ({ day, ...v }));

      // ── Top merchants ─────────────────────────────────────────
      const mAgg = new Map<string, { revenue: number; orders: number }>();
      for (const o of list) {
        const id = String(o.merchant_id || '');
        if (!id) continue;
        const c = mAgg.get(id) || { revenue: 0, orders: 0 };
        c.revenue += netRevenueOfOrder(o);
        c.orders++;
        mAgg.set(id, c);
      }
      const topMerchantIds = Array.from(mAgg.entries()).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5).map(([id]) => id);
      const topMerchants = await Promise.all(
        topMerchantIds.map(async (id) => {
          const { data: r } = await supabase.from('merchants').select('business_name').eq('id', id).maybeSingle();
          return { id, name: (r as any)?.business_name || 'Unknown', ...mAgg.get(id)! };
        })
      );

      // ── Top drivers ───────────────────────────────────────────
      const dAgg = new Map<string, number>();
      for (const o of list) {
        if (statusOf(o.status) !== 'delivered') continue;
        const id = String(o.driver_id || '');
        if (!id) continue;
        dAgg.set(id, (dAgg.get(id) || 0) + 1);
      }
      const topDriverIds = Array.from(dAgg.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
      const topDrivers = await Promise.all(
        topDriverIds.map(async (id) => {
          const { data: r } = await supabase.from('profiles').select('full_name').eq('id', id).maybeSingle();
          return { id, name: (r as any)?.full_name || 'Unknown', deliveries: dAgg.get(id) || 0 };
        })
      );

      // ── Notification analytics ────────────────────────────────
      const notifs = (notifRows as any[]) ?? [];
      const notifReadRate = notifs.length > 0 ? (notifs.filter((n: any) => n.is_read).length / notifs.length) * 100 : 0;
      const notifPushRate = notifs.length > 0 ? (notifs.filter((n: any) => n.sent_push).length / notifs.length) * 100 : 0;
      const ntMap = new Map<string, number>();
      for (const n of notifs) ntMap.set(n.type || 'unknown', (ntMap.get(n.type || 'unknown') || 0) + 1);
      const notifByType = Array.from(ntMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 8);

      // ── Review analytics ──────────────────────────────────────
      const revs = (reviewRows as any[]) ?? [];
      const totalReviews = revs.length;
      const avgOverallRating = totalReviews > 0 ? revs.reduce((s: number, r: any) => s + Number(r.overall_rating || r.rating || 0), 0) / totalReviews : 0;
      const foodR = revs.filter((r: any) => Number(r.food_rating) > 0);
      const avgFoodRating = foodR.length > 0 ? foodR.reduce((s: number, r: any) => s + Number(r.food_rating), 0) / foodR.length : 0;
      const delivR = revs.filter((r: any) => Number(r.delivery_rating) > 0);
      const avgDeliveryRating = delivR.length > 0 ? delivR.reduce((s: number, r: any) => s + Number(r.delivery_rating), 0) / delivR.length : 0;
      const ratingDistribution = [1, 2, 3, 4, 5].map(star => revs.filter((r: any) => Math.round(Number(r.overall_rating || r.rating || 0)) === star).length);

      // ── Cancellation reasons ───────────────────────────────────
      const crMap = new Map<string, number>();
      for (const c of (cancelRows as any[]) ?? []) {
        const r = String(c.reason || 'No reason').slice(0, 80);
        crMap.set(r, (crMap.get(r) || 0) + 1);
      }
      const topCancellationReasons = Array.from(crMap.entries()).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 5);

      // ── Custom orders ─────────────────────────────────────────
      const customList = (customRows as any[]) ?? [];
      const catMap = new Map<string, number>();
      for (const c of customList) catMap.set(c.category || 'other', (catMap.get(c.category || 'other') || 0) + 1);
      const customOrdersByCategory = Array.from(catMap.entries()).map(([category, count]) => ({ category, count }));

      setData({
        totalUsers: usersCount || 0,
        totalMerchants: merchantsCount || 0,
        totalDrivers: driversCount || 0,
        activeUsers: activeUsersCount || 0,
        newUsersThisPeriod: (newUserRows as any[])?.length || 0,
        pendingAccessRequests: pendingAccessCount || 0,

        totalRevenue: m.totalRevenueNet,
        totalOrders: list.length,
        growth: orderGrowth,
        revenueGrowth,
        avgOrderValue: m.avgOrderValue,
        fulfillmentRate,
        cancellationRate,
        avgPrepTime,
        avgDeliveryDistance,

        breakdown,
        ordersByStatus,
        ordersByPayment,
        ordersByType,
        vegNonVeg: { veg: vegCount, nonVeg: nonVegCount },

        revenueByDay,
        ordersByHour,

        topMerchants,
        topDrivers,

        totalNotifications: notifs.length,
        notifReadRate,
        notifPushRate,
        notifByType,

        totalReviews,
        avgOverallRating,
        avgFoodRating,
        avgDeliveryRating,
        ratingDistribution,

        topCancellationReasons,
        pendingCustomOrders: pendingCustomCount || 0,
        customOrdersByCategory,
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Analytics load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  return { data, loading, lastUpdated, reload: load };
}

