/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cartService, CartItem } from '@/services/cart';
import { restaurantService } from '@/services/restaurants';
import { orderService } from '@/services/orders';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { toast } from 'react-toastify';
import AddressSearch from '@/components/common/AddressSearch';

export default function CartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState<any>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const restaurantId = searchParams.get('restaurant');

  useEffect(() => {
    const loadData = async () => {
      const cartItems = cartService.getCart();
      setCart(cartItems);

      if (restaurantId) {
        const restaurantData = await restaurantService.getRestaurantById(restaurantId);
        setRestaurant(restaurantData);
      }
    };

    loadData();
  }, [restaurantId]);

  const updateQuantity = (itemId: string, quantity: number) => {
    const updated = cartService.updateQuantity(itemId, quantity);
    setCart(updated);
  };

  const removeItem = (itemId: string) => {
    const updated = cartService.removeItem(itemId);
    setCart(updated);
    toast.success('Item removed from cart');
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please login to place order');
      router.push('/auth/login');
      return;
    }

    if (!deliveryAddress) {
      toast.error('Please select delivery address');
      return;
    }

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      await orderService.createOrder(
        user.id,
        restaurantId!,
        cart,
        deliveryAddress,
        'cod',
        specialInstructions
      );

      cartService.clearCart();
      toast.success('Order placed successfully!');
      router.push('/customer/orders');
    } catch (error: any) {
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = subtotal < 100 ? 20 : 0;
  const tax = subtotal * 0.05;
  const total = subtotal + deliveryFee + tax;

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add items to get started</p>
          <button
            onClick={() => router.push('/customer/dashboard')}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-700 hover:text-primary"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>

            {restaurant && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <h2 className="font-bold text-gray-900">{restaurant.business_name}</h2>
                <p className="text-sm text-gray-600">{restaurant.cuisine_types?.join(', ')}</p>
              </div>
            )}

            {cart.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <p className="text-lg font-bold text-primary mt-2">₹{item.price}</p>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>

                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg px-3 py-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="text-gray-700 font-bold"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="text-gray-700 font-bold"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Address</h2>
              <AddressSearch
                onSelectAddress={(address) => {
                  setDeliveryAddress({
                    address: address.displayName,
                    city: address.city,
                    state: address.state,
                    latitude: address.lat,
                    longitude: address.lon,
                  });
                  toast.success('Address selected');
                }}
              />
              {deliveryAddress && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">{deliveryAddress.address}</p>
                </div>
              )}
            </div>

            {/* Special Instructions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Special Instructions</h2>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests? (optional)"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
              />
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Delivery Fee</span>
                  <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>GST (5%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-900">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              {subtotal < 100 && (
                <p className="text-sm text-orange-600 mb-4">
                  Add ₹{(100 - subtotal).toFixed(0)} more for free delivery
                </p>
              )}

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="font-medium text-green-800">Cash on Delivery</p>
                  <p className="text-sm text-green-600">Pay when you receive your order</p>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !deliveryAddress}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By placing order, you agree to our terms and conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
