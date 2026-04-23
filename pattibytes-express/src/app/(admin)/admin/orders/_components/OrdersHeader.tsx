'use client';
import { Download, Plus, RefreshCw, Shield, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props { isAdmin: boolean; refreshing: boolean; onRefresh(): void; onExport(): void; }

export function OrdersHeader({ isAdmin, refreshing, onRefresh, onExport }: Props) {
  const router = useRouter();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="text-primary animate-pulse" size={22} /> All Orders
        </h1>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
          {isAdmin && <Shield size={11} className="text-green-600" />}
          Manage and track all orders{isAdmin ? ' (Admin)' : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button onClick={onRefresh} disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold disabled:opacity-50">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
        <button onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-orange-600 font-semibold">
          <Download size={13} /> Export CSV
        </button>
        <button onClick={() => router.push('/admin/orders/new')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-semibold">
          <Plus size={13} /> Create
        </button>
      </div>
    </div>
  );
}


