'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, Milk, ShoppingCart, Pill, Leaf, Package,
  Shirt, Coffee, Wheat, Apple, Fish, Home, Zap,
  Scissors, BookOpen, Baby, Dumbbell, Flower2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ── Icon + colour map for known categories ────────────────────────────────────
const CATEGORY_META: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}> = {
  custom: {
    icon: Sparkles,
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
    description: 'Special requests',
  },
  dairy: {
    icon: Milk,
    color: 'from-blue-500 to-cyan-600',
    bgColor: 'bg-blue-50',
    description: 'Fresh dairy products',
  },
  grocery: {
    icon: ShoppingCart,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
    description: 'Daily essentials',
  },
  medicines: {
    icon: Pill,
    color: 'from-red-500 to-rose-600',
    bgColor: 'bg-red-50',
    description: 'Pharmacy items',
  },
  bakery: {
    icon: Wheat,
    color: 'from-yellow-500 to-amber-600',
    bgColor: 'bg-yellow-50',
    description: 'Fresh baked goods',
  },
  fruits: {
    icon: Apple,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    description: 'Fresh fruits',
  },
  vegetables: {
    icon: Leaf,
    color: 'from-green-600 to-lime-600',
    bgColor: 'bg-lime-50',
    description: 'Fresh vegetables',
  },
  clothing: {
    icon: Shirt,
    color: 'from-pink-500 to-fuchsia-600',
    bgColor: 'bg-pink-50',
    description: 'Apparel & clothing',
  },
  beverages: {
    icon: Coffee,
    color: 'from-amber-600 to-orange-700',
    bgColor: 'bg-amber-50',
    description: 'Drinks & beverages',
  },
  seafood: {
    icon: Fish,
    color: 'from-teal-500 to-cyan-600',
    bgColor: 'bg-teal-50',
    description: 'Fresh seafood',
  },
  household: {
    icon: Home,
    color: 'from-slate-500 to-gray-600',
    bgColor: 'bg-slate-50',
    description: 'Household items',
  },
  electronics: {
    icon: Zap,
    color: 'from-blue-600 to-indigo-600',
    bgColor: 'bg-indigo-50',
    description: 'Electronics & gadgets',
  },
  stationery: {
    icon: BookOpen,
    color: 'from-cyan-500 to-blue-500',
    bgColor: 'bg-cyan-50',
    description: 'Stationery & books',
  },
  salon: {
    icon: Scissors,
    color: 'from-rose-500 to-pink-600',
    bgColor: 'bg-rose-50',
    description: 'Salon & beauty',
  },
  baby: {
    icon: Baby,
    color: 'from-yellow-400 to-orange-400',
    bgColor: 'bg-yellow-50',
    description: 'Baby products',
  },
  fitness: {
    icon: Dumbbell,
    color: 'from-gray-700 to-gray-900',
    bgColor: 'bg-gray-100',
    description: 'Fitness & sports',
  },
  flowers: {
    icon: Flower2,
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-50',
    description: 'Flowers & plants',
  },
};

// Colour palette for auto-assigned unknown categories
const FALLBACK_PALETTES = [
  { color: 'from-violet-500 to-purple-600',    bgColor: 'bg-violet-50'  },
  { color: 'from-teal-500 to-green-600',       bgColor: 'bg-teal-50'    },
  { color: 'from-sky-500 to-blue-600',         bgColor: 'bg-sky-50'     },
  { color: 'from-fuchsia-500 to-pink-600',     bgColor: 'bg-fuchsia-50' },
  { color: 'from-lime-500 to-green-600',       bgColor: 'bg-lime-50'    },
  { color: 'from-orange-500 to-amber-600',     bgColor: 'bg-orange-50'  },
  { color: 'from-indigo-500 to-violet-600',    bgColor: 'bg-indigo-50'  },
  { color: 'from-rose-500 to-red-600',         bgColor: 'bg-rose-50'    },
];

type CategoryCard = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  count: number;
};

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="border border-gray-100 rounded-xl p-3 text-center animate-pulse bg-gray-50">
      <div className="w-10 h-10 rounded-lg bg-gray-200 mx-auto mb-2" />
      <div className="h-3 bg-gray-200 rounded-full w-3/4 mx-auto mb-1" />
      <div className="h-2.5 bg-gray-100 rounded-full w-1/2 mx-auto" />
    </div>
  );
}

export default function CustomOrderCategories() {
  const router = useRouter();

  const [cards,   setCards]   = useState<CategoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch active products — only id, category, name so it's lightweight
        const { data, error: err } = await supabase
          .from('customproducts')
          .select('id, category')
          .eq('isactive', true);

        if (err) throw err;
        if (cancelled) return;

        // Count products per category
        const countMap: Record<string, number> = {};
        for (const row of (data ?? []) as { id: string; category: string }[]) {
          const cat = (row.category ?? 'other').trim().toLowerCase();
          countMap[cat] = (countMap[cat] ?? 0) + 1;
        }

        // Always prepend "custom" (special requests — not from table)
        const dynamicCategories = Object.entries(countMap)
          .sort(([a], [b]) => a.localeCompare(b));

        // Build card list
        let fallbackIdx = 0;
        const built: CategoryCard[] = [
          // "Custom Order" card is always first
          {
            id:          'custom',
            label:       'Custom Order',
            description: 'Special requests',
            icon:        CATEGORY_META.custom.icon,
            color:       CATEGORY_META.custom.color,
            bgColor:     CATEGORY_META.custom.bgColor,
            count:       0,
          },
          ...dynamicCategories.map(([cat, count]) => {
            const known = CATEGORY_META[cat];
            if (known) {
              return {
                id:          cat,
                label:       cat.charAt(0).toUpperCase() + cat.slice(1),
                description: known.description,
                icon:        known.icon,
                color:       known.color,
                bgColor:     known.bgColor,
                count,
              };
            }
            // Unknown category — auto-assign fallback palette + Package icon
            const palette = FALLBACK_PALETTES[fallbackIdx % FALLBACK_PALETTES.length];
            fallbackIdx++;
            return {
              id:          cat,
              label:       cat.charAt(0).toUpperCase() + cat.slice(1),
              description: `${count} item${count !== 1 ? 's' : ''} available`,
              icon:        Package,
              color:       palette.color,
              bgColor:     palette.bgColor,
              count,
            };
          }),
        ];

        setCards(built);
      } catch (e: unknown) {
        if (!cancelled) setError((e as Error)?.message ?? 'Failed to load categories');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6
                    animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-600
                          flex items-center justify-center shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-base font-black text-gray-900">Quick Orders</h2>
        </div>

        {/* Live count badge */}
        {!loading && cards.length > 1 && (
          <span className="text-[10px] font-black bg-orange-100 text-orange-600
                           px-2 py-0.5 rounded-full border border-orange-200">
            {cards.length - 1} {cards.length - 1 === 1 ? 'category' : 'categories'}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-xs text-red-500 font-semibold bg-red-50 rounded-xl
                        px-3 py-2 border border-red-200 mb-3">
          ⚠️ {error}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/customer/custom-order?category=${cat.id}`)}
                  className={`${cat.bgColor} border border-gray-200 rounded-xl p-3 text-center
                               hover:shadow-lg hover:scale-105 transition-all duration-200 group
                               animate-in fade-in zoom-in-95 duration-300`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <div
                    className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cat.color}
                                 flex items-center justify-center shadow-md mx-auto mb-2
                                 group-hover:scale-110 transition-transform duration-200`}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 mb-0.5 truncate">
                    {cat.label}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight line-clamp-2">
                    {cat.count > 0 ? `${cat.count} items` : cat.description}
                  </p>
                </button>
              );
            })
        }
      </div>

      <p className="text-xs text-gray-400 text-center mt-3 font-medium">
        💡 Browse products or request custom items
      </p>
    </div>
  );
}
