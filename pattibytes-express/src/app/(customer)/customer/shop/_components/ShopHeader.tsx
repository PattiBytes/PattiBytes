'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

interface Props {
  cartCount: number;
}

export function ShopHeader({ cartCount }: Props) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md
                    border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">

        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center
                     hover:bg-gray-200 transition active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black text-gray-900 truncate">Shop</h1>
          <p className="text-xs text-gray-500 font-medium">Dairy, grocery &amp; more</p>
        </div>

        {/* Cart icon → /customer/cart (main cart, not custom-order) */}
        <button
          onClick={() => router.push('/customer/cart')}
          className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary to-pink-500
                     flex items-center justify-center shadow hover:shadow-lg
                     hover:scale-110 transition active:scale-95"
          aria-label="Cart"
        >
          <ShoppingCart className="w-5 h-5 text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white
                             text-[10px] font-black rounded-full flex items-center
                             justify-center shadow">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
