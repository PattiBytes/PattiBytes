'use client';

import { Store, UtensilsCrossed, Package } from 'lucide-react';
import { TabType, cx } from './types';

interface Props {
  tab: TabType;
  onChange: (t: TabType) => void;
  menuCount: number;
  orderCount: number;
}

const TABS = [
  { id: 'profile' as TabType, label: 'Profile', Icon: Store, countKey: null },
  { id: 'menu'    as TabType, label: 'Menu',    Icon: UtensilsCrossed, countKey: 'menu' as const },
  { id: 'orders'  as TabType, label: 'Orders',  Icon: Package,         countKey: 'orders' as const },
];

export function MerchantTabs({ tab, onChange, menuCount, orderCount }: Props) {
  const counts = { menu: menuCount, orders: orderCount };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-1.5 flex gap-1.5 mb-5 w-full">
      {TABS.map(({ id, label, Icon, countKey }) => {
        const count = countKey ? counts[countKey] : 0;
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cx(
              'flex-1 px-3 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 min-w-0 transition text-sm',
              active
                ? 'bg-orange-50 text-primary shadow-sm'
                : 'hover:bg-gray-50 text-gray-600 hover:text-gray-800'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
            {countKey && count > 0 && (
              <span className={cx(
                'shrink-0 min-w-[20px] h-5 inline-flex items-center justify-center rounded-full text-xs font-bold px-1.5',
                active ? 'bg-orange-200 text-primary' : 'bg-gray-100 text-gray-500'
              )}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
