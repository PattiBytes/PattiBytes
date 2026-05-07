'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export function StarPicker({
  value,
  onChange,
  size = 20,
}: {
  value: number
  onChange: (v: number) => void
  size?: number
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            size={size}
            className={
              s <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-100 text-gray-200'
            }
          />
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="text-xs text-gray-500 ml-1 tabular-nums">{hovered || value}/5</span>
      )}
    </div>
  )
}

export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-100 text-gray-200'}
        />
      ))}
    </div>
  )
}

export function RatingBadge({ rating }: { rating: number }) {
  const colors: Record<number, string> = {
    5: 'bg-green-100 text-green-700',
    4: 'bg-blue-100 text-blue-700',
    3: 'bg-yellow-100 text-yellow-700',
    2: 'bg-orange-100 text-orange-700',
    1: 'bg-red-100 text-red-700',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
        colors[rating] || colors[3]
      }`}
    >
      <Star size={11} className="fill-current" /> {rating}
    </span>
  )
}

export function StatusBadge({
  published,
}: {
  published: boolean
}) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        published ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
      }`}
    >
      {published ? '✓ Published' : '⏳ Pending'}
    </span>
  )
}