// src/app/(admin)/admin/analytics/_components/SvgBarChart.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export interface BarDatum {
  label: string;
  value: number;
  subLabel?: string;
  color?: string;
}

interface TooltipState { x: number; y: number; datum: BarDatum; }

interface Props {
  data: BarDatum[];
  height?: number;
  color?: string;
  negativeColor?: string;
  valueFormatter?: (v: number) => string;
  tooltipExtra?: (d: BarDatum) => string;
  showValues?: boolean;
  animated?: boolean;
  title?: string;
}

const PAD = { top: 20, right: 12, bottom: 48, left: 60 };

function yTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = Math.ceil(raw / mag) * mag;
  return [0, nice, nice * 2, nice * 3, nice * 4];
}

export default function SvgBarChart({
  data, height = 240, color = '#F97316', negativeColor = '#EF4444',
  valueFormatter = (v) => String(Math.round(v)),
  tooltipExtra, showValues = false, animated = true, title,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  if (!data.length) return <div className="flex items-center justify-center h-24 text-gray-400 text-sm">No data</div>;

  const W = 480;
  const cW = W - PAD.left - PAD.right;
  const cH = height - PAD.top - PAD.bottom;
  const maxV = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const ticks = yTicks(maxV);
  const barW = Math.max((cW / data.length) * 0.65, 6);
  const slot = cW / data.length;

  const toY = (v: number) => PAD.top + cH * (1 - Math.abs(v) / (ticks[ticks.length - 1] || 1));
  const toH = (v: number) => cH - (toY(v) - PAD.top);

  return (
    <div className="relative w-full select-none">
      {title && <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</p>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ height }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines + Y labels */}
        {ticks.map((tick, i) => {
          const y = PAD.top + cH * (1 - tick / (ticks[ticks.length - 1] || 1));
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke={tick === 0 ? '#D1D5DB' : '#F3F4F6'} strokeWidth={tick === 0 ? 1.5 : 1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="#9CA3AF">
                {valueFormatter(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const barH = Math.max(toH(d.value), 2);
          const y = toY(d.value);
          const c = d.color || (d.value < 0 ? negativeColor : color);
          const isHovered = tooltip?.datum.label === d.label;

          return (
            <g key={d.label + i}>
              {/* Hover column highlight */}
              {isHovered && (
                <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={cH}
                  fill={`${c}15`} rx={3} />
              )}

              {/* Bar */}
              <rect
                x={x} y={mounted ? y : PAD.top + cH} width={barW}
                height={mounted ? barH : 0}
                fill={isHovered ? `${c}dd` : c} rx={4}
                style={{ transition: animated ? `y 0.6s cubic-bezier(0.34,1.4,0.64,1) ${i * 30}ms, height 0.6s cubic-bezier(0.34,1.4,0.64,1) ${i * 30}ms` : undefined }}
                onMouseMove={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, datum: d });
                }}
                className="cursor-pointer"
              />

              {/* Top value label */}
              {showValues && mounted && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={8} fill={c} fontWeight={600}>
                  {valueFormatter(d.value)}
                </text>
              )}

              {/* X label */}
              <text x={x + barW / 2} y={height - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill="#9CA3AF">
                {d.label.length > 6 ? d.label.slice(0, 6) : d.label}
              </text>
              {d.subLabel && (
                <text x={x + barW / 2} y={height - PAD.bottom + 26} textAnchor="middle" fontSize={8} fill="#D1D5DB">
                  {d.subLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none bg-gray-900 text-white text-xs rounded-xl px-3 py-2 shadow-2xl border border-gray-700"
          style={{ left: Math.min(tooltip.x + 10, 340), top: Math.max(tooltip.y - 56, 4) }}
        >
          <p className="font-bold mb-0.5">{tooltip.datum.label}</p>
          <p className="text-orange-300 font-semibold">{valueFormatter(tooltip.datum.value)}</p>
          {tooltip.datum.subLabel && <p className="text-gray-400">{tooltip.datum.subLabel}</p>}
          {tooltipExtra && <p className="text-gray-300 mt-0.5">{tooltipExtra(tooltip.datum)}</p>}
        </div>
      )}
    </div>
  );
}