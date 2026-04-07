/* eslint-disable react-hooks/immutability */
// src/app/(admin)/admin/analytics/_components/SvgDonutChart.tsx
'use client';

import { useEffect, useState } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
}

const R = 52;
const CX = 70, CY = 70;
const CIRC = 2 * Math.PI * R;

export default function SvgDonutChart({ segments, size = 140, strokeWidth = 16, centerValue, centerLabel }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);

  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let accumulated = 0;

  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox={`0 0 ${CX * 2} ${CY * 2}`} style={{ width: size, height: size }} className="flex-shrink-0">
        {/* Background track */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F3F4F6" strokeWidth={strokeWidth} />

        <g transform={`rotate(-90, ${CX}, ${CY})`}>
          {segments.map((seg, i) => {
            const len = mounted ? (seg.value / total) * CIRC : 0;
            const offset = -accumulated;
            accumulated += (seg.value / total) * CIRC;
            return (
              <circle key={i} cx={CX} cy={CY} r={R} fill="none"
                stroke={seg.color} strokeWidth={strokeWidth}
                strokeDasharray={`${len} ${CIRC}`}
                strokeDashoffset={offset}
                style={{ transition: `stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 100}ms` }}
                strokeLinecap="round"
              />
            );
          })}
        </g>

        {/* Center text */}
        {centerValue && (
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={17} fontWeight="800" fill="#111827">
            {centerValue}
          </text>
        )}
        {centerLabel && (
          <text x={CX} y={CY + 11} textAnchor="middle" fontSize={9} fill="#6B7280">
            {centerLabel}
          </text>
        )}
      </svg>

      <div className="space-y-1.5 flex-1 min-w-0">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-gray-600 truncate flex-1">{seg.label}</span>
            <span className="text-xs font-bold text-gray-900 tabular-nums">
              {seg.value.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-gray-400 w-10 text-right">
              {((seg.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}