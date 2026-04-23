'use client';
import { ShoppingBag, Percent } from 'lucide-react';
import type { Settings } from './types';

interface Props { settings: Settings; onChange: (s: Settings) => void; }

export function OrderSection({ settings, onChange }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-4 border">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <ShoppingBag size={16} className="text-purple-600" /> Minimum Order Amount (₹)
        </label>
        <input type="number" min={0} value={settings.min_order_amount}
          onChange={e => onChange({ ...settings, min_order_amount: Math.max(0, Number(e.target.value)) })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary text-lg font-bold" />
        <p className="text-xs text-gray-500 mt-1">Orders below this amount won&apos;t be accepted</p>
      </div>
      <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-4 border">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <Percent size={16} className="text-green-600" /> Tax Percentage (%)
        </label>
        <input type="number" min={0} max={100} value={settings.tax_percentage}
          onChange={e => onChange({ ...settings, tax_percentage: Math.max(0, Math.min(100, Number(e.target.value))) })}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary text-lg font-bold" />
        <p className="text-xs text-gray-500 mt-1">Applied to each order total (0 = no tax)</p>
      </div>
    </div>
  );
}
