/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notifications';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { 
  MapPin, 
  ShoppingBag, 
  CreditCard, 
  Wallet,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { toast } from 'react-toastify';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cartData, setCartData] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [loading, setLoading] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    address: '',
    latitude: 0,
    longitude: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem('checkout_cart');
    if (stored) {
      setCartData(JSON.parse(stored));
    } else {
      toast.error('No items in cart');
      router.push('/customer/dashboard');
    }

    if (user) {
      loadSavedAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  const loadSavedAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;

      setSavedAddresses(data || []);
      
      // Auto-select default address
      const defaultAddr = data?.find((a) => a.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
  };

  const handleAddressSelect = (addressData: any) => {
    setNewAddress({
      label: 'New Address',
      address: addressData.address,
      latitude: addressData.lat,
      longitude: addressData.lon,
    });
  };

  const handleSaveAndSelectAddress = async () => {
    if (!user || !newAddress.address) return;

    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .insert([{
          user_id: user.id,
          ...newAddress,
        }])
        .select()
        .single();

      if (error) throw error;

      setSavedAddresses([...savedAddresses, data]);
      setSelectedAddress(data);
      setShowAddressModal(false);
      toast.success('Address saved!');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || !cartData || !selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);

    try {
      // Create order
      const { data: order, error } = await supabase
        .from('orders')
        .insert([{
          user_id: user.id,
          merchant_id: cartData.restaurant_id,
          items: cartData.items,
          subtotal: cartData.subtotal,
          discount: cartData.discount,
          delivery_fee: 30,
          gst: (cartData.subtotal - cartData.discount) * 0.05,
          total: cartData.total,
          payment_method: paymentMethod,
          promo_code: cartData.promo?.code,
          delivery_address: {
            address: selectedAddress.address,
            latitude: selectedAddress.latitude,
            longitude: selectedAddress.longitude,
          },
          status: 'pending',
        }])
        .select()
        .single();

      if (error) throw error;

      // Send notifications to all parties
      await notificationService.sendOrderNotification(order.id, 'pending');

      // Clear cart
      localStorage.removeItem('checkout_cart');

      toast.success('Order placed successfully!');
      router.push(`/customer/orders/${order.id}`);
    } catch (error: any) {
      console.error('Failed to place order:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!cartData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Restaurant</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="text-primary" size={24} />
                  Delivery Address
                </h2>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add New
                </button>
              </div>

              {savedAddresses.length > 0 ? (
                <div className="space-y-3">
                  {savedAddresses.map((address) => (
                    <button
                      key={address.id}
                      onClick={() => setSelectedAddress(address)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        selectedAddress?.id === address.id
                          ? 'border-primary bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-gray-900">{address.label}</p>
                          <p className="text-sm text-gray-600 mt-1">{address.address}</p>
                        </div>
                        {address.is_default && (
                          <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">No saved addresses</p>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600"
                  >
                    Add Address
                  </button>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="text-primary" size={24} />
                Payment Method
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'cod'
                      ? 'border-primary bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="text-green-600" size={24} />
                    <div>
                      <p className="font-bold text-gray-900">Cash on Delivery</p>
                      <p className="text-sm text-gray-600">Pay when you receive</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('online')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'online'
                      ? 'border-primary bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-blue-600" size={24} />
                    <div>
                      <p className="font-bold text-gray-900">Online Payment</p>
                      <p className="text-sm text-gray-600">UPI, Cards, Wallets</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-3 mb-4 pb-4 border-b">
                {cartData.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="font-semibold">₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{cartData.subtotal}</span>
                </div>
                {cartData.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span className="font-semibold">-₹{cartData.discount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">₹30</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (5%)</span>
                  <span className="font-semibold">
                    ₹{((cartData.subtotal - cartData.discount) * 0.05).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between mb-6">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-primary">₹{cartData.total.toFixed(2)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="w-full bg-primary text-white py-4 rounded-lg hover:bg-orange-600 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>

        {/* Add Address Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Add Delivery Address</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Label
                  </label>
                  <select
                    value={newAddress.label}
                    onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Address
                  </label>
                  <AddressAutocomplete onSelect={handleAddressSelect} />
                </div>

                {newAddress.address && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-900">Selected:</p>
                    <p className="text-sm text-green-800 mt-1">{newAddress.address}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddressModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAndSelectAddress}
                    disabled={!newAddress.address}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
                  >
                    Save & Select
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
