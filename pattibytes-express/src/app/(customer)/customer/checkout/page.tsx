/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { locationService, SavedAddress } from '@/services/location';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { MapPin, CreditCard, Wallet, Banknote, ArrowLeft, ShoppingBag } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [loading, setLoading] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    // Load cart from sessionStorage
    const cartData = sessionStorage.getItem('cart');
    if (cartData) {
      setCart(JSON.parse(cartData));
    } else {
      router.push('/customer/home');
    }

    if (user) {
      loadAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;

    try {
      const data = await locationService.getSavedAddresses(user.id);
      setAddresses(data);
      
      // Select default address
      const defaultAddr = data.find((addr) => addr.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      } else if (data.length > 0) {
        setSelectedAddress(data[0]);
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        user_id: user?.id,
        merchant_id: cart.restaurant_id,
        delivery_address: {
          address: selectedAddress.address,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postal_code: selectedAddress.postal_code,
        },
        items: cart.items,
        subtotal: cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0),
        delivery_fee: cart.delivery_charge,
        total: cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) + cart.delivery_charge,
        payment_method: paymentMethod,
        status: 'pending',
        special_instructions: specialInstructions,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) throw error;

      // Clear cart
      sessionStorage.removeItem('cart');

      toast.success('Order placed successfully!');
      router.push(`/customer/orders/${data.id}`);
    } catch (error: any) {
      console.error('Failed to place order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!cart) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  const subtotal = cart.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const total = subtotal + cart.delivery_charge;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-1">Review and place your order</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={24} className="text-primary" />
              Delivery Address
            </h2>

            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`block p-4 border-2 rounded-lg cursor-pointer ${
                      selectedAddress?.id === address.id
                        ? 'border-primary bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress?.id === address.id}
                      onChange={() => setSelectedAddress(address)}
                      className="sr-only"
                    />
                    <div className="flex items-start gap-3">
                      <MapPin size={20} className="text-gray-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900">{address.label}</span>
                          {address.is_default && (
                            <span className="px-2 py-1 bg-primary text-white text-xs rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{address.address}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No saved addresses</p>
                <button
                  onClick={() => router.push('/customer/addresses')}
                  className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
                >
                  Add Address
                </button>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag size={24} className="text-primary" />
              Order Summary
            </h2>

            <div className="space-y-3 mb-4">
              {cart.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-gray-900">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-4 border-t">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Delivery Fee</span>
                <span>₹{cart.delivery_charge}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Special Instructions</h2>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add any special instructions for your order..."
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={24} className="text-primary" />
              Payment Method
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${
                  paymentMethod === 'cod'
                    ? 'border-primary bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="w-5 h-5 text-primary"
                />
                <Banknote size={24} className="text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-900">Cash on Delivery</p>
                  <p className="text-sm text-gray-600">Pay when you receive</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer ${
                  paymentMethod === 'online'
                    ? 'border-primary bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                  className="w-5 h-5 text-primary"
                />
                <Wallet size={24} className="text-gray-600" />
                <div>
                  <p className="font-semibold text-gray-900">Online Payment</p>
                  <p className="text-sm text-gray-600">UPI, Cards, Wallets</p>
                </div>
              </label>
            </div>
          </div>

          {/* Place Order Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={loading || !selectedAddress}
            className="w-full bg-primary text-white px-6 py-4 rounded-lg hover:bg-orange-600 font-bold text-lg disabled:opacity-50"
          >
            {loading ? 'Placing Order...' : `Place Order • ₹${total}`}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
