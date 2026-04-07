// src/app/(admin)/admin/analytics/_components/KPICard.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  title: string;
  value: number;
  prevValue?: number;
  format?: 'number' | 'currency' | 'percent' | 'time' | 'distance';
  icon: React.ReactNode;
  iconBg: string;
  subtitle?: string;
  growth?: number;
  onClick?: () => void;
  alert?: boolean;
}

function fmt(value: number, format: Props['format'] = 'number'): string {
  if (isNaN(value)) return '—';
  switch (format) {
    case 'currency':
      try { return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }); }
      catch { return `₹${Math.round(value)}`; }
    case 'percent': return `${value.toFixed(1)}%`;
    case 'time': return `${Math.round(value)}m`;
    case 'distance': return `${value.toFixed(1)}km`;
    default: return value.toLocaleString('en-IN');
  }
}

export default function KPICard({ title, value, format, icon, iconBg, subtitle, growth, onClick, alert }: Props) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  const isPositive = (growth ?? 0) >= 0;

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-white rounded-2xl border p-5 transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300
        ${onClick ? 'cursor-pointer' : ''}
        ${alert ? 'border-red-200 bg-red-50/30' : 'border-gray-100 shadow-sm'}
      `}
    >
      {/* Alert dot */}
      {alert && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold text-gray-900 tabular-nums">
        {fmt(display, format)}
      </p>

      <div className="flex items-center justify-between mt-2">
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}{growth.toFixed(1)}% vs prev
          </div>
        )}
      </div>

      {/* Hover shine */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
    </div>
  );
}