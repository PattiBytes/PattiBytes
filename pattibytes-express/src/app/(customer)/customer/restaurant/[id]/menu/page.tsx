/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { restaurantService, type Restaurant, type MenuByCategory } from '@/services/restaurants';
import { useCart } from '@/contexts/CartContext';
import { type CartItem } from '@/services/cart';
import { getSafeImageSrc } from '@/lib/safeImage';

import {
  ShoppingCart,
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
  Leaf,
  Image as ImageIcon,
  FileText,
  Printer,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';

import { toast } from 'react-toastify';

type SortKey = 'recommended' | 'price_low' | 'price_high';

export default function RestaurantFullMenuPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, itemCount } = useCart();

  const restaurantId = String((params as any)?.id || '');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuByCategory, setMenuByCategory] = useState<MenuByCategory>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('recommended');

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Progressive render for big menus (1000)
  const [visibleCount, setVisibleCount] = useState(48);

  // Sheet preview
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetRenderAll, setSheetRenderAll] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!restaurantId) return;

    const run = async () => {
      setLoading(true);
      try {
        const [r, menu] = await Promise.all([
          restaurantService.getRestaurantById(restaurantId),
          restaurantService.getMenuItemsByCategory(restaurantId),
        ]);

        if (!r) {
          toast.error('Restaurant not found');
          router.push('/customer/dashboard');
          return;
        }

        setRestaurant(r);
        setMenuByCategory(menu || {});
      } catch (e) {
        console.error(e);
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [restaurantId, router]);

  useEffect(() => {
    // Reset visible count when filters change (keeps UI snappy)
    setVisibleCount(48);
  }, [search, vegOnly, sortKey]);

  const finalPrice = (price: number, discount?: number) => {
    const p = Number(price || 0);
    const d = Number(discount || 0);
    if (!d) return p;
    return p * (1 - d / 100);
  };

  const updateQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(10, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const add = (item: any) => {
    const quantity = quantities[item.id] || 1;

    const cartItem: CartItem = {
      id: item.id,
      merchant_id: restaurantId,
      name: item.name,
      price: item.price,
      quantity,
      image_url: item.image_url,
      is_veg: item.is_veg,
      category: item.category,
      discount_percentage: item.discount_percentage,
    };

    const ok = addToCart(cartItem, restaurant?.business_name || 'Restaurant');
    if (!ok) {
      toast.error('You have items from another restaurant. Please clear your cart first.');
      return;
    }

    toast.success(`${item.name} added to cart!`);
    setQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  };

  const flatItems = useMemo(() => {
    const all = Object.entries(menuByCategory || {}).flatMap(([category, items]) =>
      (items || []).map((it: any) => ({ ...it, category: it.category || category }))
    );

    const q = search.trim().toLowerCase();
    let list = all;

    if (vegOnly) list = list.filter((it: any) => it.is_veg === true);

    if (q) {
      list = list.filter(
        (it: any) =>
          String(it.name || '').toLowerCase().includes(q) ||
          String(it.description || '').toLowerCase().includes(q) ||
          String(it.category || '').toLowerCase().includes(q)
      );
    }

    if (sortKey === 'price_low') {
      list = [...list].sort(
        (a: any, b: any) => finalPrice(a.price, a.discount_percentage) - finalPrice(b.price, b.discount_percentage)
      );
    } else if (sortKey === 'price_high') {
      list = [...list].sort(
        (a: any, b: any) => finalPrice(b.price, b.discount_percentage) - finalPrice(a.price, a.discount_percentage)
      );
    }

    return list;
  }, [menuByCategory, search, vegOnly, sortKey]);

  const merchantLogo = getSafeImageSrc((restaurant as any)?.logo_url);

  const printSheet = () => {
    const content = sheetRef.current;
    if (!content) return;

    const existing = document.getElementById('__print_sheet__');
    if (existing) existing.remove();

    const wrapper = document.createElement('div');
    wrapper.id = '__print_sheet__';
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.width = '100%';
    wrapper.style.background = 'white';
    wrapper.style.zIndex = '99999';

    wrapper.appendChild(content.cloneNode(true));
    document.body.appendChild(wrapper);

    window.print();

    setTimeout(() => wrapper.remove(), 700);
  };

  const gridItems = flatItems.slice(0, visibleCount);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 md:pb-8">
          {/* Top bar (stacks on mobile) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-extrabold text-sm sm:text-base"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setSheetRenderAll(false);
                  setSheetOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none bg-white border border-gray-200 shadow-sm hover:shadow px-3 py-2.5 rounded-xl font-extrabold text-gray-900 text-sm sm:text-base"
              >
                <FileText className="w-5 h-5 text-gray-700" />
                <span className="sm:inline">Menu sheet</span>
              </button>

              {itemCount > 0 && (
                <button
                  onClick={() => router.push('/customer/cart')}
                  className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none bg-primary text-white px-3 sm:px-4 py-2.5 rounded-xl font-extrabold hover:bg-orange-600 text-sm sm:text-base"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="truncate">Cart ({itemCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Header */}
          <div className="bg-white rounded-2xl shadow p-3 sm:p-4 md:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                {merchantLogo ? (
                  <Image
                    src={merchantLogo}
                    alt="Merchant logo"
                    width={56}
                    height={56}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-gray-900 truncate">
                  {restaurant?.business_name || 'Full Menu'}
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-600 font-semibold mt-1">
                  Showing {gridItems.length} / {flatItems.length} items
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-3 sm:mt-4 bg-white rounded-2xl shadow p-3 sm:p-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm sm:text-base"
                  placeholder="Search items, category..."
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    aria-label="Clear search"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setVegOnly((v) => !v)}
                  aria-pressed={vegOnly}
                  className={`px-3 py-2.5 sm:py-3 rounded-xl border-2 font-extrabold inline-flex items-center gap-2 transition text-sm sm:text-base ${
                    vegOnly
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Leaf className="w-5 h-5" />
                  Veg
                </button>

                <div className="px-3 py-2.5 sm:py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-extrabold inline-flex items-center gap-2 text-sm sm:text-base">
                  <SlidersHorizontal className="w-5 h-5" />
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="bg-transparent outline-none"
                    aria-label="Sort"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price_low">Price: Low → High</option>
                    <option value="price_high">Price: High → Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="mt-6 text-gray-600 font-semibold text-sm sm:text-base">Loading menu...</div>
          ) : flatItems.length === 0 ? (
            <div className="mt-6 bg-white rounded-2xl shadow p-10 sm:p-16 text-center text-gray-600 font-bold">
              No menu items found
            </div>
          ) : (
            <>
              <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {gridItems.map((item: any) => {
                  const img = getSafeImageSrc(item.image_url);
                  const qty = quantities[item.id] || 1;
                  const hasDiscount = Number(item.discount_percentage || 0) > 0;
                  const discounted = finalPrice(item.price, item.discount_percentage);

                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow hover:shadow-lg transition overflow-hidden">
                      <div className="relative aspect-[4/3] sm:aspect-square bg-gray-100">
                        {img ? (
                          <Image
                            src={img}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400 font-extrabold text-xs sm:text-sm">
                            No Image
                          </div>
                        )}

                        {hasDiscount && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] sm:text-xs font-extrabold px-2 py-1 rounded-full">
                            {item.discount_percentage}% OFF
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 sm:p-3">
                        <div className="font-extrabold text-gray-900 line-clamp-1 text-sm sm:text-base">
                          {item.name}
                        </div>
                        <div className="text-[11px] sm:text-xs text-gray-600 line-clamp-1">
                          {String(item.category || 'Other')}
                        </div>

                        {item.description && (
                          <div className="text-[11px] sm:text-xs text-gray-600 mt-1 line-clamp-2">
                            {item.description}
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          {hasDiscount && (
                            <span className="text-[11px] sm:text-xs text-gray-400 line-through">
                              ₹{Number(item.price).toFixed(2)}
                            </span>
                          )}
                          <span className="font-extrabold text-gray-900 text-sm sm:text-base">
                            ₹{discounted.toFixed(2)}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center justify-between sm:justify-start gap-2 bg-gray-100 rounded-xl p-1">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center disabled:opacity-40"
                              disabled={qty <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="w-8 text-center font-extrabold text-gray-900 text-sm">{qty}</span>

                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white hover:bg-gray-50 border border-gray-200 flex items-center justify-center disabled:opacity-40"
                              disabled={qty >= 10}
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            onClick={() => add(item)}
                            className="w-full sm:w-auto bg-primary text-white px-3 py-2 rounded-xl font-extrabold hover:bg-orange-600 text-sm sm:text-base"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Load more */}
              {visibleCount < flatItems.length && (
                <div className="mt-5 sm:mt-6 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => setVisibleCount((c) => Math.min(c + 80, flatItems.length))}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow font-extrabold text-gray-900 text-sm sm:text-base"
                  >
                    Load more
                  </button>
                  <button
                    onClick={() => setVisibleCount(flatItems.length)}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-gray-900 text-white hover:bg-black font-extrabold text-sm sm:text-base"
                  >
                    Show all ({flatItems.length})
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile sticky cart bar */}
        {itemCount > 0 && (
          <div className="fixed bottom-4 left-3 right-3 sm:left-4 sm:right-4 md:hidden z-50">
            <button
              onClick={() => router.push('/customer/cart')}
              className="w-full bg-primary text-white px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl hover:bg-orange-600 font-extrabold flex items-center justify-between shadow-2xl text-sm sm:text-base"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-6 h-6" />
                <span>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </span>
              </div>
              <span>View Cart →</span>
            </button>
          </div>
        )}

        {/* Menu Sheet Modal (responsive + still prints A4) */}
        {sheetOpen && (
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} aria-hidden="true" />

            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-3 md:p-8">
              <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-3 border-b">
                  <div className="font-extrabold text-gray-900 text-sm sm:text-base">Menu sheet preview</div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => setSheetRenderAll(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl font-extrabold border border-gray-200 hover:bg-gray-50 text-sm"
                      title="Render all items (up to 1000)"
                    >
                      {sheetRenderAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      Render all
                    </button>

                    <button
                      onClick={printSheet}
                      className="inline-flex items-center gap-2 bg-gray-900 text-white px-3 py-2 rounded-xl font-extrabold hover:bg-gray-800 text-sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print / Save PDF
                    </button>

                    <button
                      onClick={() => setSheetOpen(false)}
                      className="px-3 py-2 rounded-xl font-extrabold border border-gray-200 hover:bg-gray-50 text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="max-h-[82vh] overflow-auto bg-gray-100 p-3 sm:p-4">
                  <div
                    ref={sheetRef}
                    className="__sheet mx-auto bg-white shadow rounded-lg w-full max-w-[794px] p-4 sm:p-7"
                    style={{ minHeight: '1123px' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
                        {merchantLogo ? (
                          <Image
                            src={merchantLogo}
                            alt="Logo"
                            width={56}
                            height={56}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-lg sm:text-2xl font-extrabold text-gray-900 truncate">
                          {restaurant?.business_name || 'Restaurant'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 font-semibold">
                          Full menu sheet • Items: {flatItems.length}
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-200 my-4" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      {(sheetRenderAll ? flatItems : flatItems.slice(0, 120)).map((item: any) => {
                        const img = getSafeImageSrc(item.image_url);
                        const price = finalPrice(item.price, item.discount_percentage);

                        return (
                          <div key={item.id} className="border border-gray-200 rounded-xl overflow-hidden">
                            <div className="flex">
                              <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 flex-shrink-0">
                                {img ? (
                                  <Image src={img} alt={item.name} fill className="object-cover" sizes="96px" />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                )}
                              </div>

                              <div className="p-3 flex-1 min-w-0">
                                <div className="font-extrabold text-gray-900 truncate text-sm sm:text-base">
                                  {item.name}
                                </div>
                                <div className="text-[11px] sm:text-xs text-gray-600 truncate">
                                  {String(item.category || 'Other')}
                                </div>
                                {item.description && (
                                  <div className="text-[11px] sm:text-xs text-gray-600 mt-1 line-clamp-2">
                                    {item.description}
                                  </div>
                                )}

                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <div className="font-extrabold text-gray-900 text-sm sm:text-base">
                                    ₹{price.toFixed(2)}
                                  </div>
                                  <button
                                    onClick={() => add(item)}
                                    className="bg-primary text-white px-3 py-1.5 rounded-lg font-extrabold hover:bg-orange-600 text-sm"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!sheetRenderAll && flatItems.length > 120 && (
                      <div className="text-[11px] sm:text-xs text-gray-700 mt-4 text-center font-semibold">
                        Preview is showing first 120 items for speed. Click “Render all” to include all {flatItems.length}.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #__print_sheet__,
            #__print_sheet__ * {
              visibility: visible !important;
            }
            #__print_sheet__ {
              position: static !important;
            }
            /* Ensure the sheet prints as A4-like width even if it was responsive on screen */
            #__print_sheet__ .__sheet {
              width: 794px !important;
              max-width: 794px !important;
              padding: 28px !important;
            }
          }
        `}</style>
      </div>
    </DashboardLayout>
  );
}
