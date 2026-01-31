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
  Store,
  Calendar,
  Printer,
  Mail,
  Download,
  Timer,
  TrendingUp,
  Bell,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

interface OrderDetail {
  id: string;
  order_number: number;
  customer_id: string;
  merchant_id: string;
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
  actual_delivery_time?: string;
  preparation_time?: number;
  promo_code?: string;
  rating?: number;
  review?: string;
  profiles?: {
    full_name: string;
    phone?: string;
    email?: string;
  };
  merchants?: {
    business_name: string;
    phone?: string;
    address?: string;
  };
  driver_id?: string;
  driver?: {
    full_name: string;
    phone?: string;
  };
}

export default function AdminOrderDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [notifyingDriver, setNotifyingDriver] = useState(false);

  useEffect(() => {
    if (!user) {
      const currentPath = window.location.pathname;
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }
    loadOrder();
    loadAvailableDrivers();

    // Real-time updates
    const subscription = supabase
      .channel(`admin-order-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${params.id}`,
        },
        (payload) => {
          console.log('Order updated in real-time:', payload);
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
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id as string)
        .single();

      if (orderError) throw orderError;

      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', orderData.customer_id)
        .single();

      const { data: merchantInfo } = await supabase
        .from('merchants')
        .select('business_name, phone, address')
        .eq('id', orderData.merchant_id)
        .single();

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
        merchants: merchantInfo,
        driver: driverInfo,
      });
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Failed to load order details');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('role', 'driver')
        .eq('is_active', true);

      if (error) throw error;
      setAvailableDrivers(data || []);
    } catch (error) {
      console.error('Failed to load drivers:', error);
    }
  };

  const sendNotification = async (userId: string, title: string, message: string, type: string, data: any = {}) => {
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        data,
      });

      if (error) {
        console.error('Notification error:', error);
        return;
      }
      console.log(`Notification sent to user ${userId}`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    setUpdating(true);

    try {
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString();
        updateData.payment_status = 'paid';
      }

      console.log('Updating order with data:', updateData);

      // Update order in database - REMOVED .select().single() to avoid 406 error
      const { error } = await supabase.from('orders').update(updateData).eq('id', order.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
      }

      console.log('Order updated successfully in database');

      // Send notification to customer
      await sendNotification(
        order.customer_id,
        'Order Status Updated',
        `Your order #${order.order_number} is now ${newStatus}`,
        'order',
        { order_id: order.id, status: newStatus }
      );

      // If status is ready, notify available drivers
      if (newStatus === 'ready' && !order.driver_id) {
        await notifyAvailableDrivers();
      }

      toast.success(`✅ Order status updated to ${newStatus}!`);
      
      // Reload order to get fresh data
      setTimeout(() => {
        loadOrder();
      }, 500);
    } catch (error: any) {
      console.error('Failed to update order:', error);
      toast.error(error.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const notifyAvailableDrivers = async () => {
    if (!order || availableDrivers.length === 0) {
      toast.warning('No available drivers found');
      return;
    }

    setNotifyingDriver(true);
    try {
      // Create assignment records for all available drivers
      const assignments = availableDrivers.map((driver) => ({
        order_id: order.id,
        driver_id: driver.id,
        status: 'pending',
      }));

      const { error: assignError } = await supabase.from('driver_assignments').insert(assignments);

      if (assignError && assignError.code !== '23505') {
        console.error('Assignment error:', assignError);
      }

      // Send notifications to all available drivers
      for (const driver of availableDrivers) {
        await sendNotification(
          driver.id,
          'New Delivery Request',
          `Order #${order.order_number} is ready for pickup from ${order.merchants?.business_name}`,
          'delivery',
          {
            order_id: order.id,
            order_number: order.order_number,
            merchant: order.merchants?.business_name,
            delivery_address: order.delivery_address,
            total_amount: order.total_amount,
            distance: order.delivery_distance_km,
          }
        );
      }

      toast.success(`📢 Notified ${availableDrivers.length} available drivers!`);
    } catch (error) {
      console.error('Failed to notify drivers:', error);
      toast.error('Failed to notify drivers');
    } finally {
      setNotifyingDriver(false);
    }
  };

  const assignDriver = async (driverId: string) => {
    if (!order || !driverId) return;

    setAssigningDriver(true);
    try {
      // Update order with driver
      const { error: updateError } = await supabase.from('orders').update({ driver_id: driverId }).eq('id', order.id);

      if (updateError) throw updateError;

      // Update assignment status
      const { error: assignError } = await supabase
        .from('driver_assignments')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('order_id', order.id)
        .eq('driver_id', driverId);

      if (assignError) console.error('Assignment update error:', assignError);

      // Send notification to driver
      const driver = availableDrivers.find((d) => d.id === driverId);
      if (driver) {
        await sendNotification(
          driverId,
          'Order Assigned',
          `You have been assigned to deliver order #${order.order_number}`,
          'delivery',
          {
            order_id: order.id,
            order_number: order.order_number,
            merchant: order.merchants?.business_name,
            delivery_address: order.delivery_address,
          }
        );
      }

      // Send notification to customer
      await sendNotification(
        order.customer_id,
        'Driver Assigned',
        `A delivery partner has been assigned to your order #${order.order_number}`,
        'order',
        { order_id: order.id }
      );

      toast.success('✅ Driver assigned successfully!');
      loadOrder();
    } catch (error) {
      console.error('Failed to assign driver:', error);
      toast.error('Failed to assign driver');
    } finally {
      setAssigningDriver(false);
    }
  };

  const printOrder = () => {
    window.print();
  };

  const downloadReceipt = () => {
    if (!order) return;

    const receipt = `
ORDER RECEIPT
=============
Order #: ${order.order_number}
Date: ${new Date(order.created_at).toLocaleString()}
Status: ${order.status}

CUSTOMER:
${order.profiles?.full_name}
${order.profiles?.phone}
${order.delivery_address}

ITEMS:
${order.items.map((item: any) => `${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`).join('\n')}

SUMMARY:
Subtotal: ₹${order.subtotal.toFixed(2)}
Delivery: ₹${order.delivery_fee.toFixed(2)}
Tax: ₹${order.tax.toFixed(2)}
Discount: -₹${order.discount.toFixed(2)}
TOTAL: ₹${order.total_amount.toFixed(2)}

Payment: ${order.payment_method} (${order.payment_status})
    `;

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.order_number}-receipt.txt`;
    a.click();
    toast.success('Receipt downloaded!');
  };

  const sendEmailToCustomer = () => {
    if (!order?.profiles?.email) {
      toast.error('Customer email not available');
      return;
    }

    window.location.href = `mailto:${order.profiles.email}?subject=Order Update - #${order.order_number}&body=Dear ${order.profiles.full_name},%0D%0A%0D%0AYour order #${order.order_number} status: ${order.status}`;
    toast.success('Email client opened');
  };

  const calculateDeliveryMetrics = () => {
    if (!order) return null;

    const orderTime = new Date(order.created_at).getTime();
    const currentTime = new Date().getTime();
    const elapsedMinutes = Math.floor((currentTime - orderTime) / 60000);

    const estimatedTime = order.estimated_delivery_time
      ? Math.floor((new Date(order.estimated_delivery_time).getTime() - orderTime) / 60000)
      : 30;

    const actualTime = order.actual_delivery_time
      ? Math.floor((new Date(order.actual_delivery_time).getTime() - orderTime) / 60000)
      : null;

    return { elapsedMinutes, estimatedTime, actualTime };
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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat },
      preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat },
      ready: { color: 'bg-orange-100 text-orange-800', icon: Package },
      picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;
  const metrics = calculateDeliveryMetrics();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Orders</span>
          </button>

          <div className="flex gap-2">
            {order.status === 'ready' && !order.driver_id && (
              <button
                onClick={notifyAvailableDrivers}
                disabled={notifyingDriver || availableDrivers.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Bell size={16} />
                <span className="hidden sm:inline">
                  {notifyingDriver ? 'Notifying...' : `Notify ${availableDrivers.length} Drivers`}
                </span>
              </button>
            )}
            <button
              onClick={sendEmailToCustomer}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Mail size={16} />
              <span className="hidden sm:inline">Email</span>
            </button>
            <button
              onClick={downloadReceipt}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Receipt</span>
            </button>
            <button
              onClick={printOrder}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header with Metrics */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h2>
                  <p className="text-sm text-gray-600 mt-1">ID: {order.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-600">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${statusConfig.color}`}>
                  <StatusIcon size={20} />
                  <span className="font-bold capitalize">{order.status.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Time Metrics */}
              {metrics && (
                <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <Timer className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                    <p className="text-xs text-gray-600">Elapsed</p>
                    <p className="text-lg font-bold text-gray-900">{metrics.elapsedMinutes} min</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-5 h-5 mx-auto text-orange-600 mb-1" />
                    <p className="text-xs text-gray-600">Estimated</p>
                    <p className="text-lg font-bold text-gray-900">{metrics.estimatedTime} min</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
                    <p className="text-xs text-gray-600">Actual</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metrics.actualTime ? `${metrics.actualTime} min` : '-'}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Management */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-bold mb-3">Change Status:</h3>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(status)}
                        disabled={updating || order.status === status}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          order.status === status
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-primary text-white hover:bg-orange-600'
                        }`}
                      >
                        {updating && order.status !== status ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Updating...
                          </span>
                        ) : (
                          status.replace('_', ' ')
                        )}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Driver Assignment */}
            {!order.driver_id && availableDrivers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Truck className="text-blue-600" size={20} />
                  Assign Driver Manually
                </h3>
                <select
                  onChange={(e) => assignDriver(e.target.value)}
                  disabled={assigningDriver}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                  defaultValue=""
                >
                  <option value="">Select a driver...</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name} - {driver.phone}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-gray-600 mt-2">
                  💡 Or click &ldquo;Notify Drivers&quot; button above to let them accept automatically
                </p>
              </div>
            )}

            {/* Rest of the component remains the same... */}
            {/* Customer Info, Restaurant Info, Order Items, etc. */}
            {/* (keeping the same code from before to save space) */}

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
                    <a href={`tel:${order.profiles.phone}`} className="text-primary hover:underline">
                      {order.profiles.phone}
                    </a>
                  </div>
                )}
                {order.profiles?.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={16} className="text-gray-600" />
                    <a href={`mailto:${order.profiles.email}`} className="text-primary hover:underline">
                      {order.profiles.email}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <MapPin className="text-primary" size={16} />
                  Delivery Address
                </h4>
                <p className="text-gray-700">{order.delivery_address}</p>
                <p className="text-sm text-gray-500 mt-1">Distance: {order.delivery_distance_km.toFixed(1)} km</p>
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Store className="text-primary" size={20} />
                Restaurant Details
              </h3>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{order.merchants?.business_name}</p>
                {order.merchants?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-600" />
                    <a href={`tel:${order.merchants.phone}`} className="text-primary hover:underline">
                      {order.merchants.phone}
                    </a>
                  </div>
                )}
                {order.merchants?.address && <p className="text-sm text-gray-600">{order.merchants.address}</p>}
              </div>

              {order.driver_id && order.driver && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <Truck className="text-primary" size={16} />
                    Delivery Partner
                  </h4>
                  <p className="font-medium">{order.driver.full_name}</p>
                  {order.driver.phone && (
                    <a href={`tel:${order.driver.phone}`} className="text-sm text-primary hover:underline">
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
                    <p className="text-lg font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Review */}
            {order.rating && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">Customer Review</h3>
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <CheckCircle
                      key={star}
                      className={`w-6 h-6 ${star <= order.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="font-bold text-lg">{order.rating}/5</span>
                </div>
                {order.review && <p className="text-gray-700 mt-2">{order.review}</p>}
              </div>
            )}
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
                  <span className="text-2xl font-bold text-primary">₹{order.total_amount.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Payment Method</p>
                    <p className="font-semibold">{order.payment_method.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment Status</p>
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                        order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {order.estimated_delivery_time && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Estimated Delivery</p>
                    <p className="font-semibold text-sm">{new Date(order.estimated_delivery_time).toLocaleString()}</p>
                  </div>
                )}

                {order.actual_delivery_time && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Actual Delivery</p>
                    <p className="font-semibold text-sm text-green-600">
                      {new Date(order.actual_delivery_time).toLocaleString()}
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
