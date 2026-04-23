// src/app/(admin)/admin/analytics/_components/TopLeaderboard.tsx
'use client';

import { Crown, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

function moneyINR(v: number) {
  try { return v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }); }
  catch { return `₹${Math.round(v)}`; }
}

const MEDALS = ['🥇', '🥈', '🥉'];

interface MerchantRow { id: string; name: string; revenue: number; orders: number; }
interface DriverRow { id: string; name: string; deliveries: number; }

export function TopMerchants({ merchants }: { merchants: MerchantRow[] }) {
  const router = useRouter();
  const maxRev = Math.max(...merchants.map(m => m.revenue), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Top Merchants</h2>
        <button onClick={() => router.push('/admin/merchants')}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 transition-colors">
          View all <ArrowRight size={12} />
        </button>
      </div>

      {merchants.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {merchants.map((m, i) => (
            <button key={m.id} onClick={() => router.push(`/admin/merchants/${m.id}`)}
              className="w-full group text-left"
            >
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-base w-6 flex-shrink-0">{MEDALS[i] || `#${i + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0 tabular-nums">{moneyINR(m.revenue)}</span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-9">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400 to-primary transition-all duration-700"
                  style={{ width: `${(m.revenue / maxRev) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopDrivers({ drivers }: { drivers: DriverRow[] }) {
  const maxD = Math.max(...drivers.map(d => d.deliveries), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Top Drivers</h2>
        <Crown size={14} className="text-yellow-500" />
      </div>

      {drivers.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {drivers.map((d, i) => (
            <div key={d.id} className="group">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-base w-6 flex-shrink-0">{MEDALS[i] || `#${i + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400">ID: {d.id.slice(0, 8)}…</p>
                </div>
                <span className="text-sm font-bold text-gray-900 shrink-0 tabular-nums">
                  {d.deliveries} <span className="font-normal text-gray-400 text-xs">trips</span>
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-9">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-700"
                  style={{ width: `${(d.deliveries / maxD) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

