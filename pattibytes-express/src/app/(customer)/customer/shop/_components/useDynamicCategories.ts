'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { type DynamicCategory, getCategoryMeta } from './types';

export function useDynamicCategories() {
  const [categories, setCategories] = useState<DynamicCategory[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('customproducts')
          .select('id, category')
          .eq('isactive', true);

        if (cancelled) return;

        const countMap: Record<string, number> = {};
        for (const row of (data ?? []) as { category: string }[]) {
          const cat = (row.category ?? 'other').trim().toLowerCase();
          countMap[cat] = (countMap[cat] ?? 0) + 1;
        }

        const total = Object.values(countMap).reduce((s, n) => s + n, 0);
        const allCat: DynamicCategory = {
          id: 'all', label: 'All', emoji: '🏪',
          accent: 'bg-gray-900 text-white', count: total,
        };

        let fallbackIdx = 0;
        const rest: DynamicCategory[] = Object.entries(countMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([cat, count]) => {
            const meta = getCategoryMeta(cat, fallbackIdx);
            if (!Object.prototype.hasOwnProperty.call(
              { dairy:1, grocery:1, bakery:1 }, cat   // known = no increment
            )) fallbackIdx++;
            return { id: cat, label: meta.label, emoji: meta.emoji, accent: meta.accent, count };
          });

        setCategories([allCat, ...rest]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { categories, loading };
}
