// src/app/(admin)/admin/analytics/_components/HourlyHeatmap.tsx
'use client';

import { useState } from 'react';

interface Props {
  data: Array<{ hour: number; count: number }>;
}

const HOUR_LABEL = (h: number) => {
  if (h === 0) return '12a';
  if (h < 12) return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
};

export default function HourlyHeatmap({ data }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const intensity = (count: number) => count / maxCount;

  const colorAt = (count: number) => {
    const pct = intensity(count);
    if (pct === 0) return '#F9FAFB';
    if (pct < 0.2) return '#FEF3C7';
    if (pct < 0.4) return '#FDE68A';
    if (pct < 0.6) return '#FDBA74';
    if (pct < 0.8) return '#FB923C';
    return '#F97316';
  };

  const peak = data.reduce((best, d) => d.count > best.count ? d : best, { hour: 0, count: 0 });
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <div className="grid grid-cols-12 gap-1 mb-1">
        {data.slice(0, 12).map((d) => (
          <div key={d.hour} className="relative group">
            <div
              className="h-8 rounded-md transition-all duration-200 cursor-pointer border border-white hover:scale-110 hover:z-10 hover:shadow-md"
              style={{ backgroundColor: colorAt(d.count) }}
              onMouseEnter={() => setHovered(d.hour)}
              onMouseLeave={() => setHovered(null)}
            />
            <p className="text-center text-xs text-gray-400 mt-0.5 leading-none">{HOUR_LABEL(d.hour)}</p>
            {hovered === d.hour && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-30 pointer-events-none shadow-xl">
                {HOUR_LABEL(d.hour)}: {d.count} orders
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-12 gap-1 mb-3">
        {data.slice(12, 24).map((d) => (
          <div key={d.hour} className="relative group">
            <div
              className="h-8 rounded-md transition-all duration-200 cursor-pointer border border-white hover:scale-110 hover:z-10 hover:shadow-md"
              style={{ backgroundColor: colorAt(d.count) }}
              onMouseEnter={() => setHovered(d.hour)}
              onMouseLeave={() => setHovered(null)}
            />
            <p className="text-center text-xs text-gray-400 mt-0.5 leading-none">{HOUR_LABEL(d.hour)}</p>
            {hovered === d.hour && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs px-2 py-1.5 rounded-lg whitespace-nowrap z-30 pointer-events-none shadow-xl">
                {HOUR_LABEL(d.hour)}: {d.count} orders
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend + peak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Low</span>
          {['#F9FAFB', '#FEF3C7', '#FDBA74', '#FB923C', '#F97316'].map((c) => (
            <span key={c} className="w-4 h-3 rounded-sm block" style={{ backgroundColor: c }} />
          ))}
          <span className="text-xs text-gray-400">High</span>
        </div>
        {total > 0 && (
          <div className="text-xs text-gray-500">
            Peak: <span className="font-bold text-primary">{HOUR_LABEL(peak.hour)}</span> ({peak.count} orders)
          </div>
        )}
      </div>
    </div>
  );
}

