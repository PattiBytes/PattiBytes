/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { locationService, type SavedAddress } from '@/services/location';
import { deliveryFeeService } from '@/services/deliveryFee';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete, { type AddressPick } from '@/components/AddressAutocomplete';
import {
  MapPin,
  ShoppingBag,
  CreditCard,
  Wallet,
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Home,
  Briefcase,
  MapPinned,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';

type NewAddress = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  isdefault: boolean;
};

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [cartData, setCartData] = useState<any>(null);

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [deliveryFee, setDeliveryFee] = useState(10);
  const [deliveryDistance, setDeliveryDistance] = useState(0);

  const [newAddress, setNewAddress] = useState<NewAddress>({
    label: 'Home',
    address: '',
    latitude: 0,
    longitude: 0,
    isdefault: false,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadCheckoutData();
  }, [user]);

  const loadCheckoutData = async () => {
    try {
      const stored = sessionStorage.getItem('checkoutdata');
      if (!stored) {
        toast.error('No items in cart');
        router.push('/customer/cart');
        return;
      }

      const data = JSON.parse(stored);
      setCartData(data);

      const addresses = await locationService.getSavedAddresses(user!.id);
      setSavedAddresses(addresses);

      const defaultAddr = addresses.find((a) => a.isdefault);
      if (defaultAddr) await handleAddressSelection(defaultAddr);
      else if (addresses.length > 0) await handleAddressSelection(addresses[0]);
    } catch (error) {
      console.error('Failed to load checkout data', error);
      toast.error('Failed to load checkout data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelection = async (address: SavedAddress) => {
    setSelectedAddress(address);

    await deliveryFeeService.loadConfig();
    const feeData = deliveryFeeService.calculateDeliveryFee(address.latitude, address.longitude);
    setDeliveryFee(feeData.fee);
    setDeliveryDistance(feeData.distance);
  };

  const handleAddressSelect = (addressData: AddressPick) => {
    setNewAddress((prev) => ({
      ...prev,
      address: addressData.address,
      latitude: addressData.lat,
      longitude: addressData.lon,
    }));
  };

  const handleSaveAddress = async () => {
    if (!user || !newAddress.address) {
      toast.error('Please select an address');
      return;
    }

    try {
      // ✅ FIX: your DB/service uses customerid (not user_id)
      const savedAddr = await locationService.saveAddress({
        customerid: user.id,
        ...newAddress,
      });

      if (savedAddr) {
        setSavedAddresses((prev) => [savedAddr, ...prev]);
        await handleAddressSelection(savedAddr);

        setShowAddressModal(false);
        setNewAddress({ label: 'Home', address: '', latitude: 0, longitude: 0, isdefault: false });

        toast.success('Address saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save address', error);
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const success = await locationService.deleteAddress(addressId);
      if (success) {
        setSavedAddresses((prev) => prev.filter((a) => a.id !== addressId));
        if (selectedAddress?.id === addressId) {
          setSelectedAddress(null);
          setDeliveryFee(10);
        }
        toast.success('Address deleted');
      }
    } catch (error) {
      console.error('Failed to delete address', error);
      toast.error('Failed to delete address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!user || !cartData || !selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    if (paymentMethod === 'online') {
      toast.info('Online payment will be available soon');
      return;
    }

    setPlacing(true);
    try {
      const merchantId = cartData.cart.merchantid || cartData.cart.merchant_id;

      const { data: merchantCheck, error: merchantError } = await supabase
        .from('merchants')
        .select('id, businessname')
        .eq('id', merchantId)
        .single();

      if (merchantError || !merchantCheck) {
        throw new Error('Restaurant not found. Please clear your cart and try again.');
      }

      const subtotal = Number(cartData.cart.subtotal || 0);
      const promoDiscount = Number(cartData.promoDiscount || 0);
      const tax = (subtotal - promoDiscount) * 0.05;
      const finalTotal = subtotal - promoDiscount + deliveryFee + tax;

      const estimatedMinutes = 30 + Math.ceil(deliveryDistance) * 5;
      const estimatedDeliveryTime = new Date(Date.now() + estimatedMinutes * 60_000);

      const orderData = {
        customerid: user.id,
        merchantid: merchantCheck.id,

        items: cartData.cart.items,
        subtotal: Number(subtotal.toFixed(2)),
        discount: Number(promoDiscount.toFixed(2)),
        deliveryfee: Number(deliveryFee.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        totalamount: Number(finalTotal.toFixed(2)),

        paymentmethod: paymentMethod,
        paymentstatus: 'pending',

        promocode: cartData.promoCode || null,

        deliveryaddress: selectedAddress.address,
        deliverylatitude: selectedAddress.latitude,
        deliverylongitude: selectedAddress.longitude,
        deliverydistancekm: Number(deliveryDistance.toFixed(2)),

        status: 'pending',
        preparationtime: 30,
        estimateddeliverytime: estimatedDeliveryTime.toISOString(),
      };

      const { data: order, error: orderError } = await supabase.from('orders').insert(orderData).select().single();

      if (orderError) throw new Error(orderError.message || 'Failed to create order');

      sessionStorage.removeItem('checkoutdata');
      localStorage.removeItem('pattibytescart');
      window.dispatchEvent(new CustomEvent('cartUpdated', { detail: null }));

      toast.success('Order placed successfully!');
      router.push(`/customer/orders/${order.id}`);
    } catch (error: any) {
      console.error('Failed to place order', error);
      toast.error(error?.message || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const getAddressIcon = (label: string) => {
    switch ((label || '').toLowerCase()) {
      case 'home':
        return <Home className="w-5 h-5" />;
      case 'work':
        return <Briefcase className="w-5 h-5" />;
      default:
        return <MapPinned className="w-5 h-5" />;
    }
  };

  if (loading) return <PageLoadingSpinner />;

  if (!cartData) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No items in checkout</p>
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600"
            >
              Browse Restaurants
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const subtotal = Number(cartData.cart.subtotal || 0);
  const promoDiscount = Number(cartData.promoDiscount || 0);
  const tax = (subtotal - promoDiscount) * 0.05;
  const finalTotal = subtotal - promoDiscount + deliveryFee + tax;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Cart</span>
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="text-primary" size={24} />
                  Delivery Address
                </h2>

                <button
                  onClick={() => setShowAddressModal(true)}
                  className="text-primary hover:bg-orange-50 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors font-semibold"
                >
                  <Plus size={16} />
                  Add New
                </button>
              </div>

              {savedAddresses.length > 0 ? (
                <div className="space-y-3">
                  {savedAddresses.map((address) => (
                    <div
                      key={address.id}
                      className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedAddress?.id === address.id
                          ? 'border-primary bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAddressSelection(address)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-primary mt-1">{getAddressIcon(address.label)}</div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900">{address.label}</p>
                            {address.isdefault && (
                              <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{address.address}</p>
                        </div>

                        {selectedAddress?.id === address.id && (
                          <Check className="text-primary flex-shrink-0" size={20} />
                        )}
                      </div>

                      {!address.isdefault && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAddress(address.id);
                          }}
                          className="absolute top-4 right-4 p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <MapPin size={48} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-4">No saved addresses</p>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-semibold"
                  >
                    Add Your First Address
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="text-primary" size={24} />
                Payment Method
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    paymentMethod === 'cod' ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Wallet className="text-green-600" size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Cash on Delivery</p>
                        <p className="text-sm text-gray-600">Pay when you receive your order</p>
                      </div>
                    </div>
                    {paymentMethod === 'cod' && <Check className="text-primary" size={24} />}
                  </div>
                </button>

                <button
                  onClick={() => toast.info('Online payment coming soon!')}
                  disabled
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <CreditCard className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Online Payment</p>
                      <p className="text-sm text-gray-600">UPI, Cards, Wallets Coming Soon</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="space-y-2 mb-4 pb-4 border-b">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Item Total</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>

                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Promo Discount</span>
                    <span className="font-semibold">-₹{promoDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">₹{deliveryFee.toFixed(2)}</span>
                </div>

                {deliveryDistance > 0 && (
                  <p className="text-xs text-gray-500">{deliveryDistance.toFixed(1)} km away</p>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">GST (5%)</span>
                  <span className="font-semibold">₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-between mb-6 pt-2">
                <span className="text-lg font-bold">Total</span>
                <span className="text-2xl font-bold text-primary">₹{finalTotal.toFixed(2)}</span>
              </div>

              {!selectedAddress && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">Please select a delivery address to continue</p>
                  </div>
                </div>
              )}

              <button
                onClick={handlePlaceOrder}
                disabled={placing || !selectedAddress}
                className="w-full bg-primary text-white py-4 rounded-xl hover:bg-orange-600 font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {placing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {placing ? 'Placing Order...' : `Place Order • ₹${finalTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>

        {showAddressModal && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddressModal(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Add Delivery Address</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address Label</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Home', 'Work', 'Other'].map((label) => (
                      <button
                        key={label}
                        onClick={() => setNewAddress((prev) => ({ ...prev, label }))}
                        className={`p-3 rounded-lg border-2 font-medium transition-all ${
                          newAddress.label === label
                            ? 'border-primary bg-orange-50 text-primary'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search & Select Address</label>
                  <AddressAutocomplete onSelect={handleAddressSelect} />
                </div>

                {!!newAddress.address && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900 mb-1">Selected Address</p>
                        <p className="text-sm text-green-800">{newAddress.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newAddress.isdefault}
                    onChange={(e) => setNewAddress((prev) => ({ ...prev, isdefault: e.target.checked }))}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Set as default address</span>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAddressModal(false);
                      setNewAddress({ label: 'Home', address: '', latitude: 0, longitude: 0, isdefault: false });
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSaveAddress}
                    disabled={!newAddress.address}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Save & Select
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
