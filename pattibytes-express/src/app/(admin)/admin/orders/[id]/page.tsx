/* eslint-disable @typescript-eslint/no-unused-vars */
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
  Building2,
  MapPinned,
  Shield,
  AlertTriangle,
  Star,
  TrendingDown,
  Award,
  RefreshCw,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

interface SavedAddress {
  id: string;
  label: string;
  recipient_name?: string;
  recipient_phone?: string;
  address: string;
  apartment_floor?: string;
  landmark?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  delivery_instructions?: string;
}

interface CustomerProfile {
  full_name: string;
  phone?: string;
  email?: string;
  total_orders?: number;
  completed_orders?: number;
  cancelled_orders?: number;
  trust_score?: number;
  is_trusted?: boolean;
  account_status?: string;
  last_order_date?: string;
}

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
  profiles?: CustomerProfile;
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
  customerAddress?: SavedAddress;
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
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    loadOrder();
    loadAvailableDrivers();

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
        () => {
          console.log('📡 Order updated - reloading...');
          loadOrder();
          toast.info('Order updated!', { autoClose: 2000 });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id, router]);

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
        .select('full_name, phone, email, total_orders, completed_orders, cancelled_orders, trust_score, is_trusted, account_status, last_order_date')
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

      let customerAddress = null;
      try {
        const { data: addressData } = await supabase
          .from('saved_addresses')
          .select('*')
          .eq('customer_id', orderData.customer_id)
          .eq('is_default', true)
          .maybeSingle();

        if (addressData) customerAddress = addressData;
      } catch (error) {
        console.log('No saved address found');
      }

      setOrder({
        ...orderData,
        profiles: customerProfile,
        merchants: merchantInfo,
        driver: driverInfo,
        customerAddress: customerAddress,
      });

      console.log('✅ Order loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load order:', error);
      toast.error('Failed to load order details');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableDrivers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('role', 'driver')
        .eq('is_active', true);

      setAvailableDrivers(data || []);
      console.log(`✅ Loaded ${data?.length || 0} available drivers`);
    } catch (error) {
      console.error('❌ Failed to load drivers:', error);
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
        is_read: false,
      });

      if (error) {
        console.error('❌ Notification error:', error);
        return false;
      }

      console.log(`✅ Notification sent to ${userId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
  if (!order) return;

  setUpdating(true);

  try {
    const updateData: any = { status: newStatus };

    if (newStatus === 'delivered') {
      updateData.actual_delivery_time = new Date().toISOString();
      updateData.payment_status = 'paid';
    }

    console.log('📝 Updating order:', {
      orderId: order.id,
      newStatus,
      updateData,
      currentUser: user?.id
    });

    // ✅ CRITICAL: Use minimal update to avoid constraint issues
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', order.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      throw error;
    }

    console.log('✅ Order updated successfully:', data);

    // Send notifications
    await sendNotification(
      order.customer_id,
      'Order Status Updated',
      `Your order #${order.order_number} is now ${newStatus.replace('_', ' ')}`,
      'order',
      { order_id: order.id, status: newStatus }
    );

    if (newStatus === 'ready' && !order.driver_id) {
      await notifyAvailableDrivers();
    }

    toast.success(`✅ Status updated to ${newStatus.replace('_', ' ')}!`);

    setTimeout(() => loadOrder(), 500);
  } catch (error: any) {
    console.error('❌ Complete error object:', error);
    
    // Better error messages
    if (error.code === '42703') {
      toast.error('❌ Database schema error. A required column is missing. Contact support.');
    } else if (error.code === '42501' || error.code === 'PGRST301') {
      toast.error('❌ Permission denied. Check your account role.');
    } else if (error.code === '23503') {
      toast.error('❌ Foreign key constraint violation. Invalid reference.');
    } else if (error.code === '23505') {
      toast.error('❌ Duplicate entry. Order already exists.');
    } else if (error.message?.includes('violates check constraint')) {
      toast.error('❌ Invalid data format. Check order values.');
    } else if (error.message) {
      toast.error(`❌ ${error.message}`);
    } else {
      toast.error('❌ Failed to update order. Check console for details.');
    }
  } finally {
    setUpdating(false);
  }
};

  const notifyAvailableDrivers = async () => {
    if (!order || availableDrivers.length === 0) {
      toast.warning('No available drivers');
      return;
    }

    setNotifyingDriver(true);
    try {
      const assignments = availableDrivers.map((driver) => ({
        order_id: order.id,
        driver_id: driver.id,
        status: 'pending',
      }));

      await supabase.from('driver_assignments').insert(assignments);

      let notifiedCount = 0;
      for (const driver of availableDrivers) {
        const success = await sendNotification(
          driver.id,
          '🚚 New Delivery Request',
          `Order #${order.order_number} is ready for pickup`,
          'delivery',
          {
            order_id: order.id,
            order_number: order.order_number,
            merchant: order.merchants?.business_name,
            delivery_address: order.delivery_address,
          }
        );
        if (success) notifiedCount++;
      }

      toast.success(`📢 Notified ${notifiedCount} drivers!`);
    } catch (error) {
      console.error('❌ Failed to notify drivers:', error);
      toast.error('Failed to notify drivers');
    } finally {
      setNotifyingDriver(false);
    }
  };

  const assignDriver = async (driverId: string) => {
    if (!order || !driverId) return;

    setAssigningDriver(true);
    try {
      await supabase.from('orders').update({ driver_id: driverId }).eq('id', order.id);

      await supabase
        .from('driver_assignments')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('order_id', order.id)
        .eq('driver_id', driverId);

      await sendNotification(
        driverId,
        'Order Assigned',
        `You have been assigned order #${order.order_number}`,
        'delivery',
        { order_id: order.id }
      );

      await sendNotification(
        order.customer_id,
        'Driver Assigned',
        `A driver has been assigned to your order`,
        'order',
        { order_id: order.id }
      );

      toast.success('✅ Driver assigned!');
      loadOrder();
    } catch (error) {
      console.error('❌ Failed to assign driver:', error);
      toast.error('Failed to assign driver');
    } finally {
      setAssigningDriver(false);
    }
  };

  const getTrustBadge = (trustScore: number, accountStatus: string) => {
    if (accountStatus === 'flagged' || trustScore < 2.0) {
      return { icon: AlertTriangle, color: 'bg-red-100 text-red-800 border-red-200', text: 'High Risk' };
    } else if (accountStatus === 'warning' || trustScore < 3.5) {
      return { icon: TrendingDown, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Caution' };
    } else if (trustScore >= 4.5) {
      return { icon: Award, color: 'bg-green-100 text-green-800 border-green-200', text: 'Trusted' };
    } else {
      return { icon: Shield, color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Verified' };
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
    const configs: Record<string, any> = {
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

  const trustScore = order.profiles?.trust_score || 5.0;
  const accountStatus = order.profiles?.account_status || 'active';
  const trustBadge = getTrustBadge(trustScore, accountStatus);
  const TrustIcon = trustBadge.icon;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Orders
          </button>

          <div className="flex gap-2">
            {order.status === 'ready' && !order.driver_id && availableDrivers.length > 0 && (
              <button
                onClick={notifyAvailableDrivers}
                disabled={notifyingDriver}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                <Bell size={16} />
                {notifyingDriver ? 'Notifying...' : `Notify ${availableDrivers.length} Drivers`}
              </button>
            )}
            <button
              onClick={() => loadOrder()}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h2>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg flex items-center gap-2 ${statusConfig.color}`}>
                  <StatusIcon size={20} />
                  <span className="font-bold capitalize">{order.status.replace('_', ' ')}</span>
                </div>
              </div>

              {/* Status Management */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Package size={18} />
                  Update Status:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'].map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(status)}
                        disabled={updating || order.status === status}
                        className={`px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                          order.status === status
                            ? 'bg-gray-200 text-gray-700 cursor-not-allowed'
                            : 'bg-primary text-white hover:bg-orange-600'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    )
                  )}
                </div>
                {updating && (
                  <div className="mt-3 flex items-center gap-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Updating order...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Driver Assignment */}
            {!order.driver_id && availableDrivers.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Truck className="text-blue-600" size={20} />
                  Assign Driver
                </h3>
                <select
                  onChange={(e) => assignDriver(e.target.value)}
                  disabled={assigningDriver}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary disabled:opacity-50"
                  defaultValue=""
                >
                  <option value="">Select a driver...</option>
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name} - {driver.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Details */}
            {order.profiles && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <User className="text-primary" size={20} />
                  Customer Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-lg">{order.profiles.full_name}</p>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${trustBadge.color}`}>
                        <TrustIcon size={14} />
                        <span className="text-xs font-bold">{trustBadge.text}</span>
                      </div>
                    </div>

                    {order.profiles.phone && (
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={16} className="text-gray-600" />
                        <a href={`tel:${order.profiles.phone}`} className="text-primary hover:underline">
                          {order.profiles.phone}
                        </a>
                      </div>
                    )}

                    {order.profiles.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-600" />
                        <a href={`mailto:${order.profiles.email}`} className="text-primary hover:underline text-sm">
                          {order.profiles.email}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Trust Score */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="text-center">
                      <Star className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
                      <p className="text-xs text-gray-600">Trust Score</p>
                      <p className="text-xl font-bold text-gray-900">{trustScore.toFixed(1)}/5.0</p>
                    </div>
                    <div className="text-center">
                      <Package className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-xl font-bold text-gray-900">{order.profiles.total_orders || 0}</p>
                    </div>
                    <div className="text-center">
                      <CheckCircle className="w-5 h-5 mx-auto text-green-600 mb-1" />
                      <p className="text-xs text-gray-600">Completed</p>
                      <p className="text-xl font-bold text-green-700">{order.profiles.completed_orders || 0}</p>
                    </div>
                    <div className="text-center">
                      <XCircle className="w-5 h-5 mx-auto text-red-600 mb-1" />
                      <p className="text-xs text-gray-600">Cancelled</p>
                      <p className="text-xl font-bold text-red-700">{order.profiles.cancelled_orders || 0}</p>
                    </div>
                  </div>

                  {/* Trust Warnings */}
                  {accountStatus === 'flagged' && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded">
                      <div className="flex gap-3">
                        <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-red-900">⚠️ High Risk Customer</p>
                          <p className="text-sm text-red-700 mt-1">
                            High cancellation rate. Consider advance payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {accountStatus === 'warning' && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                      <div className="flex gap-3">
                        <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-yellow-900">⚠️ Customer on Warning</p>
                          <p className="text-sm text-yellow-700 mt-1">Moderate cancellation rate.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {order.profiles.is_trusted && trustScore >= 4.5 && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded">
                      <div className="flex gap-3">
                        <Award className="text-green-600 flex-shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-green-900">✅ Trusted Customer</p>
                          <p className="text-sm text-green-700 mt-1">Excellent order history.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Address */}
                  <div className="pt-4 border-t">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <MapPin className="text-primary" size={16} />
                      Delivery Address
                    </h4>

                    {order.customerAddress ? (
                      <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">
                          {order.customerAddress.label === 'Home' && '🏠'}
                          {order.customerAddress.label === 'Work' && '💼'}
                          {order.customerAddress.label === 'Other' && '📍'}
                          <span>{order.customerAddress.label}</span>
                        </div>

                        {order.customerAddress.recipient_name && (
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <User size={14} className="text-gray-500" />
                              <p className="font-semibold text-sm">{order.customerAddress.recipient_name}</p>
                            </div>
                            {order.customerAddress.recipient_phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-500" />
                                <a href={`tel:${order.customerAddress.recipient_phone}`} className="text-sm text-primary hover:underline">
                                  {order.customerAddress.recipient_phone}
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        <p className="text-gray-700 font-medium">{order.customerAddress.address}</p>

                        {order.customerAddress.apartment_floor && (
                          <div className="flex items-start gap-2">
                            <Building2 size={16} className="text-gray-500 mt-0.5" />
                            <p className="text-sm text-gray-600">{order.customerAddress.apartment_floor}</p>
                          </div>
                        )}

                        {order.customerAddress.landmark && (
                          <div className="flex items-start gap-2">
                            <MapPinned size={16} className="text-gray-500 mt-0.5" />
                            <p className="text-sm text-gray-600">
                              <span className="font-semibold">Landmark:</span> {order.customerAddress.landmark}
                            </p>
                          </div>
                        )}

                        {order.customerAddress.delivery_instructions && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-1 flex items-center gap-1">
                              <Bell size={12} />
                              Delivery Instructions:
                            </p>
                            <p className="text-sm text-blue-800">{order.customerAddress.delivery_instructions}</p>
                          </div>
                        )}

                        <p className="text-sm text-gray-500">Distance: {order.delivery_distance_km.toFixed(1)} km</p>
                      </div>
                    ) : (
                      <p className="text-gray-700">{order.delivery_address}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Restaurant Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Store className="text-primary" size={20} />
                Restaurant Details
              </h3>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900 text-lg">{order.merchants?.business_name}</p>
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
                    Driver
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
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package size={20} className="text-primary" />
                Order Items ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-3 border-b last:border-0">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="text-lg font-bold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
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
                    <span>Discount</span>
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
