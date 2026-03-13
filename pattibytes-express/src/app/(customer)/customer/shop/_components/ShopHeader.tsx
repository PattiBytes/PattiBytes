'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, Search, X } from 'lucide-react';

interface Props {
  cartCount:   number;
  search:      string;
  setSearch:   (v: string) => void;
  totalProducts: number;
}

export function ShopHeader({ cartCount, search, setSearch, totalProducts }: Props) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md
                    border-b border-gray-100 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">

        {/* Top row */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center
                       hover:bg-gray-200 transition active:scale-90 flex-shrink-0"
            aria-label="Back">
            <ArrowLeft className="w-4 h-4 text-gray-800" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-gray-900 leading-tight">Shop</h1>
            <p className="text-[11px] text-gray-400 font-semibold">
              {totalProducts > 0 ? `${totalProducts} products` : 'Dairy, grocery & more'}
            </p>
          </div>

          <button onClick={() => router.push('/customer/cart')}
            className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary to-pink-500
                       flex items-center justify-center shadow hover:shadow-lg
                       hover:scale-110 transition active:scale-95 flex-shrink-0"
            aria-label="Cart">
            <ShoppingCart className="w-4 h-4 text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white
                               text-[10px] font-black rounded-full flex items-center
                               justify-center shadow animate-in zoom-in duration-200">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Inline search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-9 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-2xl
                       font-semibold text-sm focus:ring-2 focus:ring-primary/30
                       focus:border-primary focus:bg-white transition"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
                         hover:text-gray-600 transition">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
