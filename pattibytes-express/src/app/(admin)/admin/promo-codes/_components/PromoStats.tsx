'use client';
import { BadgePercent, Gift, Lock, Zap } from 'lucide-react';
import type { PromoCodeRow } from '../_types';

export function PromoStats({ promos }: { promos: PromoCodeRow[] }) {
  const now    = new Date();
  // FIX: active count excludes expired promos
  const active  = promos.filter(p => p.is_active && (!p.valid_until || new Date(p.valid_until) > now)).length;
  const bxgy    = promos.filter(p => p.deal_type === 'bxgy').length;
  const secret  = promos.filter(p => p.is_secret).length;
  const autoApp = promos.filter(p => p.auto_apply && p.is_active).length;

  const cards = [
    { label: 'Total',       value: promos.length, Icon: BadgePercent, cls: 'bg-blue-50   text-blue-700'   },
    { label: 'Active',      value: active,         Icon: Zap,          cls: 'bg-green-50  text-green-700'  },
    { label: 'BXGY Offers', value: bxgy,           Icon: Gift,         cls: 'bg-purple-50 text-purple-700' },
    { label: 'Secret',      value: secret,         Icon: Lock,         cls: 'bg-amber-50  text-amber-700'  },
    { label: 'Auto-apply',  value: autoApp,        Icon: Zap,          cls: 'bg-orange-50 text-orange-700' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
      {cards.map(({ label, value, Icon, cls }) => (
        <div key={label}
          className={`flex items-center gap-2 ${cls} rounded-xl px-3 py-2 flex-shrink-0 border border-white/60 shadow-sm`}>
          <Icon size={13} className="opacity-80" />
          <div>
            <p className="text-xs opacity-60 leading-none">{label}</p>
            <p className="text-sm font-bold leading-tight">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}