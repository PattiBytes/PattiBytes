'use client';
import { Star, Trash2, MessageSquare, TrendingUp } from 'lucide-react';
import type { Review } from '../_types';

export function ReviewsStats({ reviews }: { reviews: Review[] }) {
  const total     = reviews.length;
  const withRating = reviews.filter(r => Number(r.rating || r.overall_rating) > 0);
  const avg       = withRating.length
    ? withRating.reduce((s, r) => s + Number(r.overall_rating || r.rating || 0), 0) / withRating.length
    : 0;
  const fiveStars = reviews.filter(r => Number(r.overall_rating || r.rating) >= 5).length;
  const oneStars  = reviews.filter(r => Number(r.overall_rating || r.rating) <= 2 && Number(r.overall_rating || r.rating) > 0).length;

  const cards = [
    { label: 'Total Reviews', value: total,              Icon: MessageSquare, cls: 'bg-blue-50 text-blue-700'    },
    { label: 'Avg Rating',    value: avg.toFixed(1)+'★', Icon: Star,          cls: 'bg-amber-50 text-amber-700'  },
    { label: '5 Star',        value: fiveStars,           Icon: TrendingUp,    cls: 'bg-green-50 text-green-700'  },
    { label: 'Low (≤2★)',     value: oneStars,            Icon: Trash2,        cls: 'bg-red-50 text-red-700'      },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
      {cards.map(({ label, value, Icon, cls }) => (
        <div key={label} className={`flex items-center gap-2 ${cls} rounded-lg px-3 py-2 flex-shrink-0 shadow-sm border border-white/60`}>
          <Icon size={14} className="opacity-80" />
          <div>
            <p className="text-xs opacity-70 leading-none">{label}</p>
            <p className="text-sm font-bold leading-tight">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

