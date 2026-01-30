 
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cartService } from '@/services/cart';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Image from 'next/image';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Store,
  AlertCircle,
  Loader2,
  Tag,
  IndianRupee,
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, clearCart } = useCart();
  const [validating, setValidating] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  const handleUpdateQuantity = (itemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity < 1 || newQuantity > 10) return;
    updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = (itemId: string, itemName: string) => {
    removeFromCart(itemId);
    toast.success(`${itemName} removed from cart`);
  };

  const handleClearCart = () => {
    clearCart();
    setShowClearModal(false);
    toast.success('Cart cleared');
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;

    setValidating(true);
    try {
      const validation = await cartService.validateCart();
      
      if (!validation.valid) {
        toast.error(validation.message || 'Cart validation failed');
        return;
      }

      // Navigate to checkout
      router.push('/customer/checkout');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to proceed to checkout');
    } finally {
      setValidating(false);
    }
  };

  const calculateItemPrice = (price: number, discount?: number) => {
    if (!discount) return price;
    return price * (1 - discount / 100);
  };

  if (!cart || cart.items.length === 0) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
            </div>

            {/* Empty Cart */}
            <div className="bg-white rounded-2xl shadow-lg p-16 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">
                Add items from restaurants to get started
              </p>
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="bg-primary text-white px-8 py-3 rounded-xl hover:bg-orange-600 font-semibold transition-colors"
              >
                Browse Restaurants
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const deliveryFee = 0; // You can calculate based on distance
  const tax = cart.subtotal * 0.05; // 5% tax
  const finalTotal = cart.subtotal + deliveryFee + tax;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 pb-32 md:pb-8">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
                <p className="text-sm text-gray-600">{cart.items.length} items</p>
              </div>
            </div>

            <button
              onClick={() => setShowClearModal(true)}
              className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Cart</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Restaurant Info */}
              <div className="bg-white rounded-xl shadow-md p-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Ordering from</p>
                  <h2 className="font-bold text-gray-900">{cart.merchant_name}</h2>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="bg-white rounded-xl shadow-md divide-y">
                {cart.items.map((item) => {
                  const itemPrice = calculateItemPrice(item.price, item.discount_percentage);
                  const totalItemPrice = itemPrice * item.quantity;
                  const hasDiscount = item.discount_percentage && item.discount_percentage > 0;

                  return (
                    <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-4">
                        {/* Item Image */}
                        {item.image_url ? (
                          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart className="w-8 h-8 text-gray-400" />
                          </div>
                        )}

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {item.is_veg !== undefined && (
                                  <div
                                    className={`w-4 h-4 border-2 ${
                                      item.is_veg ? 'border-green-600' : 'border-red-600'
                                    } flex items-center justify-center flex-shrink-0`}
                                  >
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        item.is_veg ? 'bg-green-600' : 'bg-red-600'
                                      }`}
                                    />
                                  </div>
                                )}
                                <h3 className="font-bold text-gray-900 text-sm md:text-base">
                                  {item.name}
                                </h3>
                              </div>
                              {item.category && (
                                <p className="text-xs text-gray-500 mb-1">{item.category}</p>
                              )}
                            </div>

                            <button
                              onClick={() => handleRemoveItem(item.id, item.name)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Price & Quantity */}
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              {hasDiscount ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 line-through">
                                    ₹{item.price}
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    ₹{itemPrice.toFixed(2)}
                                  </span>
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                    {item.discount_percentage}% OFF
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-gray-900">₹{item.price}</span>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                                disabled={item.quantity <= 1}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-4 h-4 text-gray-700" />
                              </button>
                              <span className="w-8 text-center font-bold text-gray-900">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                                disabled={item.quantity >= 10}
                                className="w-8 h-8 flex items-center justify-center hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-4 h-4 text-gray-700" />
                              </button>
                            </div>
                          </div>

                          {/* Total Item Price */}
                          <div className="mt-2 text-right">
                            <p className="text-sm text-gray-600">
                              Total: <span className="font-bold text-gray-900">₹{totalItemPrice.toFixed(2)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add More Items */}
              <button
                onClick={() => router.push(`/customer/restaurant/${cart.merchant_id}`)}
                className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-primary hover:bg-orange-50 transition-colors text-primary font-semibold"
              >
                + Add more items from {cart.merchant_name}
              </button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Bill Summary</h2>

                <div className="space-y-3 mb-4 pb-4 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({cart.items.length} items)</span>
                    <span className="font-semibold text-gray-900">₹{cart.subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    {deliveryFee === 0 ? (
                      <span className="text-green-600 font-semibold">FREE</span>
                    ) : (
                      <span className="font-semibold text-gray-900">₹{deliveryFee.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Taxes & Fees (5%)</span>
                    <span className="font-semibold text-gray-900">₹{tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-5 h-5 text-primary" />
                      <span className="text-2xl font-bold text-primary">
                        {finalTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Savings */}
                {cart.items.some(item => item.discount_percentage && item.discount_percentage > 0) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-green-700">
                      <Tag className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        You saved ₹
                        {cart.items
                          .reduce((total, item) => {
                            if (item.discount_percentage) {
                              const savings = (item.price * item.discount_percentage / 100) * item.quantity;
                              return total + savings;
                            }
                            return total;
                          }, 0)
                          .toFixed(2)}{' '}
                        on this order!
                      </span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={validating}
                  className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {validating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>

                <div className="mt-4 flex items-start gap-2 text-xs text-gray-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Review your order carefully. Prices and availability are subject to change.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Bar (Mobile) */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 lg:hidden z-40">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-600">Total Amount</p>
              <p className="text-xl font-bold text-primary">₹{finalTotal.toFixed(2)}</p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={validating}
              className="bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {validating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating...
                </>
              ) : (
                'Checkout'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Clear Cart Modal */}
      {showClearModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowClearModal(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Clear Cart?</h2>
              <p className="text-gray-600">
                Are you sure you want to remove all items from your cart?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearCart}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold transition-colors"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
