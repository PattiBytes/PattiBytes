/* eslint-disable @typescript-eslint/no-unused-vars */
 
// src/app/(admin)/admin/analytics/_components/InsightPanels.tsx
'use client';

import { Bell, Star, XCircle } from 'lucide-react';

function moneyINR(v: number) {
  try { return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }); }
  catch { return `₹${Math.round(v)}`; }
}

// ── Notification Insights ────────────────────────────────────────────────────
interface NotifProps {
  total: number;
  readRate: number;
  pushRate: number;
  byType: Array<{ type: string; count: number }>;
}

const NOTIF_TYPE_LABELS: Record<string, string> = {
  new_order: '🛍️ New Order', order_update: '📦 Order Update',
  driver_assigned: '🚗 Driver Assigned', promo: '🎁 Promo',
  system: '⚙️ System', review: '⭐ Review',
};

export function NotificationInsights({ total, readRate, pushRate, byType }: NotifProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bell size={15} className="text-blue-500" />
        <h2 className="text-sm font-bold text-gray-900">Notification Intelligence</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Sent', value: total.toLocaleString('en-IN'), color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Read Rate', value: `${readRate.toFixed(1)}%`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Push Delivered', value: `${pushRate.toFixed(1)}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
            <p className={`text-base font-bold ${stat.color} tabular-nums`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {byType.length > 0 && (
        <div className="space-y-2">
          {byType.map(({ type, count }) => {
            const maxCount = Math.max(...byType.map(t => t.count), 1);
            return (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-32 truncate">{NOTIF_TYPE_LABELS[type] || type}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Review Insights ──────────────────────────────────────────────────────────
interface ReviewProps {
  totalReviews: number;
  avgOverall: number;
  avgFood: number;
  avgDelivery: number;
  ratingDistribution: number[];
}

function StarBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-16">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all duration-700"
          style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

export function ReviewInsights({ totalReviews, avgOverall, avgFood, avgDelivery, ratingDistribution }: ReviewProps) {
  const maxDist = Math.max(...ratingDistribution, 1);
  const STAR_COLORS = ['#EF4444', '#F97316', '#FACC15', '#84CC16', '#22C55E'];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star size={15} className="text-yellow-500 fill-yellow-400" />
          <h2 className="text-sm font-bold text-gray-900">Review Analytics</h2>
        </div>
        <div className="flex items-center gap-1">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-base font-bold text-gray-900">{avgOverall.toFixed(2)}</span>
          <span className="text-xs text-gray-400">/ 5</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-yellow-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-yellow-600 tabular-nums">{totalReviews}</p>
          <p className="text-xs text-gray-500">Reviews</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-orange-600 tabular-nums">{avgFood.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Food ⭐</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600 tabular-nums">{avgDelivery.toFixed(1)}</p>
          <p className="text-xs text-gray-500">Delivery ⭐</p>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        <StarBar label="Overall" value={avgOverall} />
        <StarBar label="Food" value={avgFood} />
        <StarBar label="Delivery" value={avgDelivery} />
      </div>

      {/* Rating distribution */}
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = ratingDistribution[star - 1] || 0;
          return (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-5">{star}★</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(count / maxDist) * 100}%`, backgroundColor: STAR_COLORS[star - 1] }} />
              </div>
              <span className="text-xs text-gray-600 w-5 text-right tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Cancellation Insights ────────────────────────────────────────────────────
interface CancelProps {
  cancellationRate: number;
  topReasons: Array<{ reason: string; count: number }>;
}

export function CancellationInsights({ cancellationRate, topReasons }: CancelProps) {
  const maxCount = Math.max(...topReasons.map(r => r.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <XCircle size={15} className="text-red-500" />
          <h2 className="text-sm font-bold text-gray-900">Cancellation Insights</h2>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${cancellationRate > 15 ? 'bg-red-100 text-red-700' : cancellationRate > 8 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {cancellationRate.toFixed(1)}% rate
        </span>
      </div>

      {topReasons.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No cancellations this period 🎉</p>
      ) : (
        <div className="space-y-2.5">
          {topReasons.map(({ reason, count }, i) => (
            <div key={i}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-xs text-gray-700 leading-tight flex-1">{reason}</p>
                <span className="text-xs font-bold text-red-600 shrink-0">{count}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-400 rounded-full transition-all duration-700"
                  style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Revenue Breakdown Panel ───────────────────────────────────────────────────
interface BreakdownProps {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
}

export function RevenueBreakdownPanel({ subtotal, deliveryFee, tax, discount }: BreakdownProps) {
  const total = subtotal + deliveryFee + tax;
  const rows = [
    { label: 'Subtotal', value: subtotal, color: '#F97316', bg: 'bg-orange-100' },
    { label: 'Delivery Fees', value: deliveryFee, color: '#3B82F6', bg: 'bg-blue-100' },
    { label: 'Tax Collected', value: tax, color: '#8B5CF6', bg: 'bg-purple-100' },
    { label: 'Discounts Given', value: -discount, color: '#EF4444', bg: 'bg-red-100' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-4">Revenue Breakdown</h2>
      <div className="space-y-3">
       
        {rows.map(({ label, value, color, bg }) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0`} style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-600 flex-1">{label}</span>
            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min((Math.abs(value) / (total || 1)) * 100, 100)}%`, backgroundColor: color }} />
            </div>
            <span className={`text-xs font-bold tabular-nums w-24 text-right ${value < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {moneyINR(Math.abs(value))}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-100 flex justify-between">
          <span className="text-xs font-bold text-gray-700">Net Revenue</span>
          <span className="text-sm font-bold text-primary tabular-nums">{moneyINR(subtotal + deliveryFee + tax - discount)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Custom Orders Panel ──────────────────────────────────────────────────────
interface CustomOrdersProps {
  pending: number;
  byCategory: Array<{ category: string; count: number }>;
}

const CAT_COLORS: Record<string, string> = {
  dairy: '#60A5FA', grocery: '#34D399', medicines: '#F87171',
  custom: '#A78BFA', food: '#FB923C', other: '#9CA3AF',
};

export function CustomOrdersPanel({ pending, byCategory }: CustomOrdersProps) {
  const total = byCategory.reduce((s, c) => s + c.count, 0);
  const maxCount = Math.max(...byCategory.map(c => c.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Custom Orders</h2>
        {pending > 0 && (
          <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full animate-pulse">
            {pending} pending
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-3 tabular-nums">{total}</p>
      {byCategory.length === 0 ? (
        <p className="text-xs text-gray-400">No custom orders yet</p>
      ) : (
        <div className="space-y-2">
          {byCategory.map(({ category, count }) => (
            <div key={category} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 capitalize w-20 truncate">{category}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(count / maxCount) * 100}%`, backgroundColor: CAT_COLORS[category.toLowerCase()] || '#9CA3AF' }} />
              </div>
              <span className="text-xs font-bold text-gray-700 tabular-nums w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}