'use client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { TrendingUp, Users, ShoppingBag, Clock, XCircle, CheckCircle, IndianRupee } from 'lucide-react';
import type { RoleCounts, OrderAnalytics } from './types';
import { formatINR } from './utils';

interface Props {
  roleCounts: RoleCounts;
  analytics: OrderAnalytics;
  filteredTotal: number;
}

export default function UserStatsCards({ roleCounts, analytics, filteredTotal }: Props) {
  const cards = [
    // ── Role counts ──
    {
      label: 'Customers',
      value: roleCounts.customers,
      icon: Users,
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      sub: 'text-blue-600',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Merchants',
      value: roleCounts.merchants,
      icon: ShoppingBag,
      bg: 'bg-orange-50',
      text: 'text-orange-900',
      sub: 'text-orange-600',
      iconColor: 'text-orange-500',
    },
    {
      label: 'Drivers',
      value: roleCounts.drivers,
      icon: TrendingUp,
      bg: 'bg-green-50',
      text: 'text-green-900',
      sub: 'text-green-600',
      iconColor: 'text-green-500',
    },
    {
      label: 'Admins',
      value: roleCounts.admins + roleCounts.superadmins,
      icon: Users,
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      sub: 'text-purple-600',
      iconColor: 'text-purple-500',
    },
    // ── Order analytics ──
    {
      label: 'Total Orders',
      value: analytics.totalOrders,
      icon: ShoppingBag,
      bg: 'bg-indigo-50',
      text: 'text-indigo-900',
      sub: 'text-indigo-600',
      iconColor: 'text-indigo-500',
      footer: `${analytics.pendingOrders} pending`,
    },
    {
      label: 'Delivered',
      value: analytics.completedOrders,
      icon: CheckCircle,
      bg: 'bg-teal-50',
      text: 'text-teal-900',
      sub: 'text-teal-600',
      iconColor: 'text-teal-500',
      footer: `${analytics.cancelledOrders} cancelled`,
    },
    {
      label: 'Total Revenue',
      value: formatINR(analytics.totalRevenue),
      icon: IndianRupee,
      bg: 'bg-emerald-50',
      text: 'text-emerald-900',
      sub: 'text-emerald-600',
      iconColor: 'text-emerald-500',
      footer: `Avg ${formatINR(analytics.avgOrderValue)}`,
    },
    {
      label: "Today's Orders",
      value: analytics.todayOrders,
      icon: Clock,
      bg: 'bg-amber-50',
      text: 'text-amber-900',
      sub: 'text-amber-600',
      iconColor: 'text-amber-500',
      footer: `${formatINR(analytics.todayRevenue)} today`,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-xl p-3 min-w-0`}>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-semibold ${c.sub} truncate`}>{c.label}</p>
            <c.icon size={14} className={c.iconColor} />
          </div>
          <p className={`text-xl font-bold ${c.text} truncate`}>{c.value}</p>
          {c.footer && (
            <p className={`text-xs ${c.sub} mt-0.5 truncate`}>{c.footer}</p>
          )}
        </div>
      ))}

      {/* Filtered total pill */}
      <div className="col-span-2 sm:col-span-4 lg:col-span-8 bg-gray-50 rounded-xl p-3 flex items-center gap-3">
        <Users size={16} className="text-gray-500 shrink-0" />
        <span className="text-sm text-gray-700">
          Showing <strong>{filteredTotal}</strong> user{filteredTotal !== 1 ? 's' : ''} in current filter
        </span>
      </div>
    </div>
  );
}