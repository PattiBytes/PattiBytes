 

export type OrderForMetrics = {
  id?: string;
  created_at: string;
  status?: string | null;
  payment_status?: string | null;
  total_amount?: number | null;
  merchant_id?: string | null;
  driver_id?: string | null;
};

export function startOfDayISO(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().split('T')[0];
}

export function isProcessingStatus(status?: string | null) {
  const s = String(status || '').toLowerCase();
  return ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'].includes(s);
}

export function netRevenueOfOrder(o: OrderForMetrics) {
  const amt = Number(o.total_amount ?? 0) || 0;
  const status = String(o.status || '').toLowerCase();
  // requirement: cancelled should minus that cost
  if (status === 'cancelled') return -amt;
  return amt;
}

export function computeOrderMetrics(orders: OrderForMetrics[]) {
  const totalOrders = orders.length;

  const pendingOrders = orders.filter((o) => String(o.status || '').toLowerCase() === 'pending').length;
  const deliveredOrders = orders.filter((o) => String(o.status || '').toLowerCase() === 'delivered').length;
  const cancelledOrders = orders.filter((o) => String(o.status || '').toLowerCase() === 'cancelled').length;
  const processingOrders = orders.filter((o) => isProcessingStatus(o.status)).length;

  const totalRevenueNet = orders.reduce((sum, o) => sum + netRevenueOfOrder(o), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenueNet / totalOrders : 0;

  return {
    totalOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    processingOrders,
    totalRevenueNet,
    avgOrderValue,
  };
}

export function calcGrowthPercent(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

export function groupRevenueByDay(orders: OrderForMetrics[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    const day = String(o.created_at || '').slice(0, 10);
    map.set(day, (map.get(day) || 0) + netRevenueOfOrder(o));
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, revenue]) => ({ day, revenue }));
}
