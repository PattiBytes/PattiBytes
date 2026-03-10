import type { Order } from '../_types';

export function exportOrdersToCSV(orders: Order[]): void {
  const headers = [
    'Order #','ID','Customer','Phone','Restaurant','Type',
    'Amount','Discount','Status','Payment','Payment Status',
    'Item Categories','Items Count','Created At','Updated At',
  ];

  const rows = orders.map(o => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cats = [...new Set((o.items ?? []).map((it: any) => it?.category).filter(Boolean))].join(' | ');
    return [
      String(o.order_number ?? '').trim() || o.id.slice(0, 8),
      o.id,
      o.customerName ?? 'N/A',
      o.customer_phone ?? '',
      o.merchants?.business_name ?? 'N/A',
      o.order_type ?? 'restaurant',
      Number(o.total_amount).toFixed(2),
      Number(o.discount ?? 0).toFixed(2),
      o.status,
      o.payment_method,
      o.payment_status,
      cats,
      String((o.items ?? []).length),
      new Date(o.created_at).toLocaleString(),
      o.updated_at ? new Date(o.updated_at).toLocaleString() : '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
  });

  const csv  = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  const url  = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a    = Object.assign(document.createElement('a'), { href: url, download: `orders-${new Date().toISOString().split('T')[0]}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}
