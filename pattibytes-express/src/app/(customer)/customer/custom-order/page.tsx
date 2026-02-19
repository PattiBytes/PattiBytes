/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  ShoppingCart,
  Loader2,
  Plus,
  Package,
  MessageSquare,
  Send,
} from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type CustomProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  imageurl?: string | null;
  description?: string | null;
  isactive: boolean;
};

function CustomOrderContent() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'custom';

  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDescription, setOrderDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    loadProducts();
    loadCartCount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customproducts')
        .select('*')
        .eq('category', category)
        .eq('isactive', true)
        .order('name');

      if (error) throw error;
      setProducts((data || []) as CustomProduct[]);
    } catch (e: any) {
      console.error('Load products error:', e);
      toast.error(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCartCount = async () => {
    try {
      const cartId = localStorage.getItem('cartId');
      if (!cartId) {
        setCartCount(0);
        return;
      }

      const { data, error } = await supabase
        .from('cartitems')
        .select('quantity')
        .eq('cartid', cartId);

      if (error) throw error;
      const total = (data || []).reduce((sum, item: any) => sum + (item.quantity || 0), 0);
      setCartCount(total);
    } catch (e) {
      console.error('Load cart count error:', e);
    }
  };

  const addToCart = async (product: CustomProduct) => {
    try {
      let cartId = localStorage.getItem('cartId');

      // Create cart if doesn't exist
      if (!cartId) {
        const { data: newCart, error } = await supabase
          .from('carts')
          .insert({
            customerid: user?.id || null,
            merchantid: null,
            createdat: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) throw error;
        cartId = newCart.id;
        localStorage.setItem('cartId', cartId);
      }

      // Check if item exists
      const { data: existing } = await supabase
        .from('cartitems')
        .select('*')
        .eq('cartid', cartId)
        .eq('productid', product.id)
        .maybeSingle();

      if (existing) {
        // Update quantity
        await supabase
          .from('cartitems')
          .update({ quantity: existing.quantity + 1 })
          .eq('id', existing.id);
      } else {
        // Insert new item
        await supabase.from('cartitems').insert({
          cartid: cartId,
          productid: product.id,
          productname: product.name,
          productprice: product.price,
          quantity: 1,
          category: product.category,
          imageurl: product.imageurl,
        });
      }

      toast.success(`${product.name} added to cart`);
      loadCartCount();
    } catch (e: any) {
      console.error('Add to cart error:', e);
      toast.error(e?.message || 'Failed to add to cart');
    }
  };

  const submitCustomRequest = async () => {
    if (!orderDescription.trim()) {
      toast.error('Please describe what you need');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('customorderrequests').insert({
        customerid: user?.id || null,
        category,
        description: orderDescription,
        status: 'pending',
        createdat: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Custom order request submitted! We'll contact you soon.");
      setOrderDescription('');

      setTimeout(() => {
        router.push('/customer-dashboard');
      }, 1500);
    } catch (e: any) {
      console.error('Submit error:', e);
      toast.error(e?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const goToCart = () => {
    router.push('/customer/cart');
  };

  const getCategoryTitle = () => {
    const titles: Record<string, string> = {
      custom: 'Custom Orders',
      dairy: 'Dairy Products',
      grocery: 'Grocery Items',
      medicines: 'Medicines',
    };
    return titles[category] || 'Products';
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black text-gray-900 flex-1">{getCategoryTitle()}</h1>
            <button
              onClick={goToCart}
              className="p-3 bg-primary text-white rounded-xl hover:shadow-lg transition-all relative"
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* Products Section */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : products.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Available Products
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all group"
                  >
                    {product.imageurl ? (
                      <img
                        src={product.imageurl}
                        alt={product.name}
                        className="w-full h-32 object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-32 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    <div className="p-3">
                      <h3 className="font-bold text-sm text-gray-900 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <p className="text-sm font-bold text-primary mb-3">
                        ₹{product.price.toFixed(2)}/{product.unit}
                      </p>
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full bg-primary text-white py-2 rounded-lg text-sm font-bold hover:shadow-md transition-all flex items-center justify-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={goToCart}
                className="w-full mt-6 bg-gradient-to-r from-primary to-pink-600 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                View Cart & Checkout ({cartCount} items)
              </button>
            </div>
          ) : null}

          {/* Custom Request Section */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-primary/20 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Can&apos;t Find What You Need?
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Describe your custom order requirements and we&apos;ll get back to you with a quote.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  What do you need? *
                </label>
                <textarea
                  value={orderDescription}
                  onChange={(e) => setOrderDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  placeholder={`Example for ${category}:\n- Fresh milk 5 litres daily delivery\n- Organic vegetables basket\n- Custom birthday cake 2kg chocolate\n- Prescription medicines with photo upload`}
                />
              </div>

              <button
                onClick={submitCustomRequest}
                disabled={submitting || !orderDescription.trim()}
                className="w-full bg-gradient-to-r from-primary to-pink-600 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Custom Request
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                💡 Our team will review and contact you within 24 hours
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CustomOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CustomOrderContent />
    </Suspense>
  );
}
