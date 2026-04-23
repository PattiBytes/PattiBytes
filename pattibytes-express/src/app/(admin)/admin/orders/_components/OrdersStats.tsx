'use client';
import { CheckCircle, Clock, MessageSquare, TrendingUp, Package } from 'lucide-react';
import type { OrderStats } from '../_types';

export function OrdersStats({ stats }: { stats: OrderStats }) {
  const items = [
    { label: 'Total',    value: stats.total,                    Icon: Package,       t: 'text-gray-700',   bg: 'bg-gray-50'    },
    { label: 'Active',   value: stats.active,                   Icon: Clock,         t: 'text-yellow-700', bg: 'bg-yellow-50'  },
    { label: 'Done',     value: stats.completed,                Icon: CheckCircle,   t: 'text-green-700',  bg: 'bg-green-50'   },
    { label: 'Revenue',  value: `₹${stats.revenue.toFixed(0)}`, Icon: TrendingUp,    t: 'text-primary',    bg: 'bg-orange-50'  },
    { label: 'Custom ⚠', value: stats.customPending,            Icon: MessageSquare, t: 'text-violet-700', bg: 'bg-violet-50'  },
  ];
  return (
    <div className="flex overflow-x-auto gap-2 mb-3 pb-0.5 scrollbar-hide">
      {items.map(({ label, value, Icon, t, bg }, i) => (
        <div key={label}
          className={`flex items-center gap-2 ${bg} rounded-lg px-3 py-2 flex-shrink-0 animate-slide-up border border-white/60 shadow-sm`}
          style={{ animationDelay: `${i * 40}ms` }}>
          <Icon size={14} className={`${t} opacity-80`} />
          <div>
            <p className="text-xs text-gray-500 leading-none">{label}</p>
            <p className={`text-sm font-bold ${t} leading-tight`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}


