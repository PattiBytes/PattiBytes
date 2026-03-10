/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Clock, ChefHat, Package, Truck, CheckCircle, XCircle } from 'lucide-react';

export function formatDate(d?: string | null): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function getTimeDiff(created: string, updated?: string | null): string {
  if (!updated) return '';
  const m = Math.floor((new Date(updated).getTime() - new Date(created).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function resolveCustomerName(o: {
  customer_id?: string | null; customer_notes?: string | null;
  customer_phone?: string | null; profiles?: { full_name?: string | null } | null;
}): string {
  if (!o.customer_id) {
    if (o.customer_notes) {
      if (o.customer_notes.includes('Walk-in:'))
        return o.customer_notes.replace('Walk-in:', '').split('\n')[0].trim();
      return o.customer_notes.split('\n')[0].trim() || 'Walk-in Customer';
    }
    return o.customer_phone ? `Walk-in (${o.customer_phone})` : 'Walk-in Customer';
  }
  return o.profiles?.full_name || 'Unknown';
}

const STATUS_CFG: Record<string, { color: string; icon: React.ElementType }> = {
  pending  : { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock       },
  confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200',       icon: ChefHat     },
  preparing: { color: 'bg-purple-100 text-purple-800 border-purple-200', icon: ChefHat     },
  ready    : { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Package     },
  assigned : { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Truck       },
  picked_up: { color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: Truck       },
  delivered: { color: 'bg-green-100 text-green-800 border-green-200',    icon: CheckCircle },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle     },
  quoted   : { color: 'bg-cyan-100 text-cyan-800 border-cyan-200',       icon: Package     },
  accepted : { color: 'bg-teal-100 text-teal-800 border-teal-200',       icon: CheckCircle },
  rejected : { color: 'bg-red-100 text-red-800 border-red-200',          icon: XCircle     },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon size={10} /> {status.replace(/_/g, ' ')}
    </span>
  );
}

export function OrderTypeBadge({ type }: { type?: string | null }) {
  if (!type || type === 'restaurant') return null;
  const map: Record<string, string> = {
    custom : 'bg-violet-100 text-violet-800 border-violet-200',
    grocery: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-bold ${map[type] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {type}
    </span>
  );
}

/** Shows unique item categories as small tags. */
export function CategoryTags({ items }: { items?: any[] }) {
  if (!items?.length) return null;
  const cats = [...new Set(items.map((it: any) => it?.category).filter(Boolean))];
  if (!cats.length) return null;
  return (
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {cats.slice(0, 3).map(c => (
        <span key={c} className="text-xs px-1 py-0 bg-orange-50 text-orange-700 rounded border border-orange-100 leading-5">{c}</span>
      ))}
      {cats.length > 3 && <span className="text-xs text-gray-400">+{cats.length - 3}</span>}
    </div>
  );
}
