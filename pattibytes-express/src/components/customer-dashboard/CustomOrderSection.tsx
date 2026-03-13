'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ClipboardList, ArrowRight, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Known category → emoji map ─────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  dairy:       '🥛',
  grocery:     '🛒',
  bakery:      '🍞',
  fruits:      '🍎',
  vegetables:  '🥦',
  beverages:   '🥤',
  pharmacy:    '💊',
  medicines:   '💊',
  clothing:    '👕',
  electronics: '⚡',
  stationery:  '📒',
  seafood:     '🐟',
  household:   '🏠',
  salon:       '✂️',
  baby:        '🍼',
  fitness:     '🏋️',
  flowers:     '🌸',
  other:       '📦',
  custom:      '✨',
  snacks:      '🍿',
  meat:        '🥩',
  sweets:      '🍬',
  ice_cream:   '🍦',
  spices:      '🌶️',
  oils:        '🫙',
};

const FALLBACK_EMOJI = '📦';

type CategoryPill = {
  id:    string;
  label: string;
  emoji: string;
  count: number;
};

// ── Skeleton pill ──────────────────────────────────────────────────────────
function SkeletonPill() {
  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1 px-3.5 py-2.5
                    rounded-2xl bg-gray-100 border-2 border-gray-100 animate-pulse w-[64px]">
      <div className="w-6 h-6 rounded-lg bg-gray-200" />
      <div className="w-10 h-2 rounded-full bg-gray-200" />
    </div>
  );
}

export function CustomOrderSection() {
  const router = useRouter();

  const [pills,   setPills]   = useState<CategoryPill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('customproducts')
          .select('id, category')
          .eq('isactive', true);

        if (error || cancelled) return;

        // Count per category
        const countMap: Record<string, number> = {};
        for (const row of (data ?? []) as { category: string }[]) {
          const cat = (row.category ?? 'other').trim().toLowerCase();
          countMap[cat] = (countMap[cat] ?? 0) + 1;
        }

        const built: CategoryPill[] = Object.entries(countMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([cat, count]) => ({
            id:    cat,
            label: cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            emoji: CATEGORY_EMOJI[cat] ?? FALLBACK_EMOJI,
            count,
          }));

        if (!cancelled) setPills(built);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-3">

      {/* ── Section header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-gray-900 flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                          flex items-center justify-center shadow">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          Quick Shop
        </h2>
        <button
          onClick={() => router.push('/customer/shop')}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
        >
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── Category pills — horizontal scroll ── */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonPill key={i} />)
          : pills.length === 0
            ? (
              // Empty state pill
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl
                              bg-gray-50 border border-gray-200 text-xs text-gray-400 font-semibold">
                📦 No categories yet
              </div>
            )
            : pills.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => router.push(`/customer/shop?category=${cat.id}`)}
                className="flex-shrink-0 flex flex-col items-center gap-1 px-3.5 py-2.5
                           rounded-2xl bg-white border-2 border-gray-200
                           hover:border-primary hover:shadow-md hover:scale-105
                           transition-all duration-200 animate-in fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="text-xl leading-none">{cat.emoji}</span>
                <span className="text-[10px] font-black text-gray-700 whitespace-nowrap">
                  {cat.label}
                </span>
                {cat.count > 0 && (
                  <span className="text-[9px] text-gray-400 font-semibold leading-none">
                    {cat.count}
                  </span>
                )}
              </button>
            ))
        }
      </div>

      {/* ── Two main CTAs ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/customer/shop')}
          className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-pink-50
                     border-2 border-orange-200 rounded-2xl p-4 text-left
                     hover:shadow-xl hover:scale-[1.02] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-pink-500
                          flex items-center justify-center shadow-lg mb-2.5
                          group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <p className="font-black text-gray-900 text-sm">Browse Shop</p>
          <p className="text-[11px] text-gray-500 font-semibold mt-0.5 leading-tight">
            {loading
              ? <span className="inline-block w-20 h-2 bg-gray-200 rounded-full animate-pulse" />
              : `${pills.length} categories`
            }
          </p>
          <ArrowRight className="absolute right-3 bottom-3 w-4 h-4 text-primary opacity-0
                                 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => router.push('/customer/custom-order')}
          className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50
                     border-2 border-purple-200 rounded-2xl p-4 text-left
                     hover:shadow-xl hover:scale-[1.02] transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                          flex items-center justify-center shadow-lg mb-2.5
                          group-hover:scale-110 transition-transform">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <p className="font-black text-gray-900 text-sm">Custom Order</p>
          <p className="text-[11px] text-gray-500 font-semibold mt-0.5 leading-tight">
            Can&apos;t find it? Request it
          </p>
          <ArrowRight className="absolute right-3 bottom-3 w-4 h-4 text-purple-500 opacity-0
                                 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  );
}
