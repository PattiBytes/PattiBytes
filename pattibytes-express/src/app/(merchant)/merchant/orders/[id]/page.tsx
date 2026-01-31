/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Package,
  Phone,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  User,
  DollarSign,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

interface OrderDetail {
  id: string;
  order_number: number;
  customer_id: string;
  items: any[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  delivery_distance_km: number;
  created_at: string;
  estimated_delivery_time?: string;
  preparation_time?: number;
  promo_code?: string;
  profiles?: {
    full_name: string;
    phone?: string;
    email?: string;
  };
  driver_id?: string;
  driver?: {
    full_name: string;
    phone?: string;
  };
}

export default function MerchantOrderDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrder();

    // Real-time updates
    const subscription = supabase
      .channel(`merchant-order-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${params.id}`,
        },
        () => {
          loadOrder();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  const loadOrder = async () => {
  if (!user || !params.id) return;

  try {
    // Get merchant ID
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (merchantError) throw merchantError;
    setMerchantId(merchant.id);

    // Get order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id as string)
      .eq('merchant_id', merchant.id)
      .single();

    if (orderError) throw orderError;

    // Get customer profile
    const { data: customerProfile } = await supabase
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', orderData.customer_id)
      .single();

    // Get driver info if assigned
    let driverInfo = null;
    if (orderData.driver_id) {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', orderData.driver_id)
        .single();
      driverInfo = data;
    }

    setOrder({
      ...orderData,
      profiles: customerProfile,
      driver: driverInfo,
    });
  } catch (error) {
    console.error('Failed to load order:', error);
    toast.error('Failed to load order details');
    router.push('/merchant/orders');
  } finally {
    setLoading(false);
  }
};


  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    setUpdating(true);

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      toast.success(`Order ${newStatus}!`);
      loadOrder();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <PageLoadingSpinner />;

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-gray-600">Order not found</p>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusConfig = (status: string) => {
    const configs: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'New Order' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat, label: 'Confirmed' },
      preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat, label: 'Preparing' },
      ready: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Ready' },
      picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Picked Up' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push('/merchant/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Orders</span>
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Placed on {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${statusConfig.color}`}>
                  <StatusIcon size={20} />
                  <span className="font-bold">{statusConfig.label}</span>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                {order.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateOrderStatus('confirmed')}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Accept Order
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to reject this order?')) {
                          updateOrderStatus('cancelled');
                        }
                      }}
                      disabled={updating}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </>
                )}

                {order.status === 'confirmed' && (
                  <button
                    onClick={() => updateOrderStatus('preparing')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <ChefHat size={16} />
                    Start Preparing
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateOrderStatus('ready')}
                    disabled={updating}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
                  >
                    <Package size={16} />
                    Mark as Ready
                  </button>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User className="text-primary" size={20} />
                Customer Details
              </h3>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{order.profiles?.full_name}</p>
                {order.profiles?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-600" />
                    <a
                      href={`tel:${order.profiles.phone}`}
                      className="text-primary hover:underline"
                    >
                      {order.profiles.phone}
                    </a>
                  </div>
                )}
                {order.profiles?.email && (
                  <p className="text-sm text-gray-600">{order.profiles.email}</p>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <MapPin className="text-primary" size={16} />
                  Delivery Address
                </h4>
                <p className="text-gray-700">{order.delivery_address}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Distance: {order.delivery_distance_km.toFixed(1)} km
                </p>
              </div>

              {order.driver_id && order.driver && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <Truck className="text-primary" size={16} />
                    Delivery Partner
                  </h4>
                  <p className="font-medium">{order.driver.full_name}</p>
                  {order.driver.phone && (
                    <a
                      href={`tel:${order.driver.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {order.driver.phone}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <DollarSign className="text-primary" size={20} />
                Order Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{order.subtotal.toFixed(2)}</span>
                </div>

                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount {order.promo_code && `(${order.promo_code})`}</span>
                    <span className="font-semibold">-₹{order.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="font-semibold">₹{order.delivery_fee.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">GST (5%)</span>
                  <span className="font-semibold">₹{order.tax.toFixed(2)}</span>
                </div>

                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹{order.total_amount.toFixed(2)}
                  </span>
                </div>

                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-600 mb-1">Payment Method</p>
                  <p className="font-semibold">{order.payment_method.toUpperCase()}</p>
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                    order.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.payment_status.toUpperCase()}
                  </span>
                </div>

                {order.estimated_delivery_time && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Estimated Delivery</p>
                    <p className="font-semibold text-sm">
                      {new Date(order.estimated_delivery_time).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
