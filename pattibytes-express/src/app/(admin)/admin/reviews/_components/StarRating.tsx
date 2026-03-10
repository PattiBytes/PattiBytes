'use client';
import { useState } from 'react';
import { Star } from 'lucide-react';

interface Props {
  value    : number;
  onChange ?: (v: number) => void;
  size     ?: number;
  label    ?: string;
}

export function StarRating({ value, onChange, size = 16, label }: Props) {
  const [hovered, setHovered] = useState(0);
  const interactive = !!onChange;

  return (
    <div className="flex flex-col gap-0.5">
      {label && <p className="text-xs text-gray-400 font-semibold">{label}</p>}
      <div className="flex items-center gap-0.5">
        {[1,2,3,4,5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          >
            <Star
              size={size}
              className={`transition-colors ${
                star <= (hovered || value)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-gray-100 text-gray-300'
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="text-xs text-gray-500 font-semibold ml-1">{value.toFixed(1)}</span>
        )}
      </div>
    </div>
  );
}
