'use client';
import { Filter, RefreshCw, Search, Timer } from 'lucide-react';

const ALL_STATUSES = ['pending','confirmed','preparing','ready','assigned','picked_up','delivered','cancelled'];
const INTERVALS    = [10, 15, 20, 30, 45, 60, 120];

interface AutoReload { enabled: boolean; interval: number; countdown: number; setEnabled(v: boolean): void; setInterval(v: number): void; }
interface Props {
  searchQuery: string; statusFilter: string; autoReload: AutoReload;
  onSearch(v: string): void; onStatus(v: string): void;
}

export function OrdersFilters({ searchQuery, statusFilter, onSearch, onStatus, autoReload }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-3 mb-4 space-y-2.5 animate-fade-in" style={{ animationDelay: '200ms' }}>
      <div className="grid md:grid-cols-2 gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input type="text" placeholder="Search ID, customer, phone, restaurant…"
            value={searchQuery} onChange={e => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent" />
        </div>
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <select value={statusFilter} onChange={e => onStatus(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary appearance-none">
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Auto-reload bar */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <button type="button" onClick={() => autoReload.setEnabled(!autoReload.enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors ${autoReload.enabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoReload.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
            <RefreshCw size={11} className={autoReload.enabled ? 'text-primary animate-spin' : 'text-gray-400'} />
            Auto-reload
          </span>
        </label>

        <div className="flex items-center gap-1.5">
          <Timer size={12} className="text-gray-400" />
          <select value={autoReload.interval} onChange={e => autoReload.setInterval(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-primary">
            {INTERVALS.map(s => <option key={s} value={s}>{s}s</option>)}
          </select>
        </div>

        {autoReload.enabled && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-500">Next in</span>
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="#f97316" strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 13}`}
                  strokeDashoffset={`${2 * Math.PI * 13 * (1 - autoReload.countdown / autoReload.interval)}`}
                  strokeLinecap="round" className="transition-all duration-1000" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-primary">
                {autoReload.countdown}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


