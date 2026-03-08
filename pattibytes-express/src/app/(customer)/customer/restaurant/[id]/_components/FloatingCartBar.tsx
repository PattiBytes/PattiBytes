'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart, ChevronRight } from 'lucide-react';

interface Props { itemCount: number; }

export function FloatingCartBar({ itemCount }: Props) {
  const router = useRouter();
  if (!itemCount) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:hidden z-50 animate-in slide-in-from-bottom duration-500">
      <button
        onClick={() => router.push('/customer/cart')}
        className="w-full bg-gradient-to-r from-primary to-pink-500 text-white px-6 py-4 rounded-2xl hover:shadow-2xl font-black flex items-center justify-between shadow-2xl hover:scale-105 transition-all"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-6 h-6" />
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>
        <span className="flex items-center gap-1">
          View Cart <ChevronRight className="w-5 h-5" />
        </span>
      </button>
    </div>
  );
}
