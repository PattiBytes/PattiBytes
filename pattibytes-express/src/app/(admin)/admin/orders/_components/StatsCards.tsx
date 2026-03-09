'use client';

import React from 'react';
import { Package, Clock, CheckCircle, TrendingUp, ClipboardList, AlertCircle } from 'lucide-react';
import type { AdminStats } from './shared';

interface Props { stats: AdminStats }

const CARDS = [
  {
    key: 'total'         as const,
    label: 'Total Orders',
    icon: Package,
    colorClass: 'from-white to-gray-50',
    textClass: 'text-gray-900',
    iconClass: 'text-gray-400',
    labelClass: 'text-gray-600',
    format: (v: number) => String(v),
  },
  {
    key: 'active'        as const,
    label: 'Active',
    icon: Clock,
    colorClass: 'from-yellow-50 to-white',
    textClass: 'text-yellow-600',
    iconClass: 'text-yellow-500',
    labelClass: 'text-yellow-700',
    format: (v: number) => String(v),
  },
  {
    key: 'completed'     as const,
    label: 'Delivered',
    icon: CheckCircle,
    colorClass: 'from-green-50 to-white',
    textClass: 'text-green-600',
    iconClass: 'text-green-500',
    labelClass: 'text-green-700',
    format: (v: number) => String(v),
  },
  {
    key: 'revenue'       as const,
    label: 'Revenue',
    icon: TrendingUp,
    colorClass: 'from-orange-50 to-white',
    textClass: 'text-primary',
    iconClass: 'text-primary',
    labelClass: 'text-orange-700',
    // ✅ No rupee symbol — use Rs. prefix
    format: (v: number) => 'Rs.' + v.toFixed(0),
  },
  {
    key: 'customTotal'   as const,
    label: 'Custom Requests',
    icon: ClipboardList,
    colorClass: 'from-purple-50 to-white',
    textClass: 'text-purple-700',
    iconClass: 'text-purple-400',
    labelClass: 'text-purple-700',
    format: (v: number) => String(v),
  },
  {
    key: 'customPending' as const,
    label: 'Pending Quotes',
    icon: AlertCircle,
    colorClass: 'from-pink-50 to-white',
    textClass: 'text-pink-700',
    iconClass: 'text-pink-400',
    labelClass: 'text-pink-700',
    format: (v: number) => String(v),
  },
];

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
      {CARDS.map(({ key, label, icon: Icon, colorClass, textClass, iconClass, labelClass, format }, i) => (
        <div
          key={key}
          className={`bg-gradient-to-br ${colorClass} rounded-lg shadow p-3
                      hover:shadow-lg transition-all animate-slide-up`}
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <p className={`text-xs font-medium flex items-center gap-1 ${labelClass}`}>
            <Icon size={13} className={iconClass} />
            {label}
          </p>
          <p className={`text-lg sm:text-xl font-bold mt-1 ${textClass}`}>
            {format(stats[key])}
          </p>
        </div>
      ))}
    </div>
  );
}
