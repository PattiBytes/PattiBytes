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
  Download,
  MessageCircle,
  AlertTriangle,
  Store,
  Calendar,
  Navigation,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';
import Image from 'next/image';

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
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_distance_km: number;
  created_at: string;
  estimated_delivery_time?: string;
  actual_delivery_time?: string;
  preparation_time?: number;
  promo_code?: string;
  rating?: number;
  review?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  profiles?: {
    full_name: string;
    phone?: string;
    email?: string;
  };
  merchants?: {
    business_name: string;
    logo_url?: string;
    phone?: string;
    address?: string;
  };
  driver_id?: string;
  driver?: {
    full_name: string;
    phone?: string;
  };
}

export default function CustomerOrderDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customerProfile, setCustomerProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrder();
    loadCustomerProfile();

    // Real-time updates
    const subscription = supabase
      .channel(`customer-order-${params.id}`)
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

  const loadCustomerProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('cancelled_orders_count, is_trusted, trust_score')
      .eq('id', user.id)
      .single();

    setCustomerProfile(data);
  };

  const loadOrder = async () => {
    if (!user || !params.id) return;

    try {
      // Get basic order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.id as string)
        .eq('customer_id', user.id)
        .single();

      if (orderError) throw orderError;

      // Get customer profile
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', orderData.customer_id)
        .single();

      // Get merchant info
      const { data: merchantInfo } = await supabase
        .from('merchants')
        .select('business_name, logo_url, phone, address')
        .eq('id', orderData.merchant_id)
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
        merchants: merchantInfo,
        driver: driverInfo,
      });
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Failed to load order details');
      router.push('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order || !cancelReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setCancelling(true);

    try {
      // Update order status
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason,
          cancelled_by: 'customer',
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Record cancellation
      const { error: cancelError } = await supabase
        .from('order_cancellations')
        .insert([
          {
            order_id: order.id,
            customer_id: user!.id,
            reason: cancelReason,
          },
        ]);

      if (cancelError) throw cancelError;

      toast.success('Order cancelled successfully');
      setShowCancelModal(false);
      loadOrder();
      loadCustomerProfile();

      // Show warning if multiple cancellations
      if (customerProfile && customerProfile.cancelled_orders_count >= 2) {
        setTimeout(() => {
          toast.warning(
            'Multiple cancellations detected. Your account may be marked as untrusted.',
            { autoClose: 5000 }
          );
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const downloadInvoice = () => {
    if (!order) return;

    const invoiceContent = `
═══════════════════════════════════════
           ORDER INVOICE
═══════════════════════════════════════

Order Number: #${order.order_number}
Order Date: ${new Date(order.created_at).toLocaleString()}

CUSTOMER DETAILS
Name: ${order.profiles?.full_name}
Phone: ${order.profiles?.phone || 'N/A'}
Delivery Address: ${order.delivery_address}

RESTAURANT DETAILS
Name: ${order.merchants?.business_name}
Phone: ${order.merchants?.phone || 'N/A'}

ORDER ITEMS
───────────────────────────────────────
${order.items
  .map(
    (item: any, i: number) =>
      `${i + 1}. ${item.name}
   ₹${item.price} × ${item.quantity} = ₹${(item.price * item.quantity).toFixed(2)}`
  )
  .join('\n')}

PAYMENT SUMMARY
───────────────────────────────────────
Subtotal:           ₹${order.subtotal.toFixed(2)}
${order.discount > 0 ? `Discount (${order.promo_code || ''}):    -₹${order.discount.toFixed(2)}` : ''}
Delivery Fee:       ₹${order.delivery_fee.toFixed(2)}
GST (5%):          ₹${order.tax.toFixed(2)}
───────────────────────────────────────
TOTAL:             ₹${order.total_amount.toFixed(2)}

Payment Method: ${order.payment_method.toUpperCase()}
Payment Status: ${order.payment_status.toUpperCase()}

Order Status: ${order.status.toUpperCase()}
${order.estimated_delivery_time ? `Estimated Delivery: ${new Date(order.estimated_delivery_time).toLocaleString()}` : ''}
${order.actual_delivery_time ? `Delivered At: ${new Date(order.actual_delivery_time).toLocaleString()}` : ''}

═══════════════════════════════════════
        Thank you for your order!
═══════════════════════════════════════
    `;

    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${order.order_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Invoice downloaded!');
  };

  const contactViaWhatsApp = (phone: string, name: string) => {
    const message = `Hi ${name}, I have a query regarding my order #${order?.order_number}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const canCancelOrder = () => {
    if (!order) return false;
    return ['pending', 'confirmed'].includes(order.status);
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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Order Placed' },
      confirmed: { color: 'bg-blue-100 text-blue-800', icon: ChefHat, label: 'Confirmed' },
      preparing: { color: 'bg-purple-100 text-purple-800', icon: ChefHat, label: 'Preparing' },
      ready: { color: 'bg-orange-100 text-orange-800', icon: Package, label: 'Ready for Pickup' },
      picked_up: { color: 'bg-indigo-100 text-indigo-800', icon: Truck, label: 'Out for Delivery' },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Cancelled' },
    };
    return configs[status] || configs.pending;
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-8">
        <button
          onClick={() => router.push('/customer/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Orders</span>
        </button>

        {/* Trust Warning */}
        {customerProfile && !customerProfile.is_trusted && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-1">Account Status: Untrusted</h3>
                <p className="text-sm text-red-800">
                  You have cancelled {customerProfile.cancelled_orders_count} orders. Multiple cancellations
                  may affect your ability to place future orders. Please confirm orders only when you&apos;re sure.
                </p>
                <p className="text-xs text-red-700 mt-2">Trust Score: {customerProfile.trust_score}/100</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {order.merchants?.logo_url && (
                      <Image
                        src={order.merchants.logo_url}
                        alt={order.merchants.business_name}
                        width={48}
                        height={48}
                        className="rounded-lg"
                      />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {order.merchants?.business_name}
                      </h2>
                      <p className="text-sm text-gray-600">Order #{order.order_number}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${statusConfig.color}`}
                >
                  <StatusIcon size={20} />
                  <span className="font-bold">{statusConfig.label}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <button
                  onClick={downloadInvoice}
                  disabled={order.status !== 'delivered'}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Download Invoice
                </button>

                {canCancelOrder() && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-semibold transition-colors"
                  >
                    <XCircle size={18} />
                    Cancel Order
                  </button>
                )}

                {order.merchants?.phone && (
                  <button
                    onClick={() =>
                      contactViaWhatsApp(
                        order.merchants!.phone!,
                        order.merchants!.business_name
                      )
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 font-semibold transition-colors"
                  >
                    <MessageCircle size={18} />
                    Contact Restaurant
                  </button>
                )}

                {order.driver?.phone && (
                  <button
                    onClick={() => contactViaWhatsApp(order.driver!.phone!, order.driver!.full_name)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold transition-colors"
                  >
                    <Phone size={18} />
                    Contact Driver
                  </button>
                )}
              </div>

              {/* Cancellation Info */}
              {order.status === 'cancelled' && order.cancellation_reason && (
                <div className="mt-4 pt-4 border-t bg-red-50 rounded-lg p-4">
                  <h4 className="font-bold text-red-900 mb-2">Cancellation Details</h4>
                  <p className="text-sm text-red-800">
                    <strong>Cancelled by:</strong> {order.cancelled_by || 'Customer'}
                  </p>
                  <p className="text-sm text-red-800">
                    <strong>Reason:</strong> {order.cancellation_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Order Progress */}
            {order.status !== 'cancelled' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4">Order Status</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                  {/* Status Steps */}
                  <div className="space-y-8">
                    {[
                      { status: 'pending', label: 'Order Placed', icon: Clock },
                      { status: 'confirmed', label: 'Confirmed', icon: CheckCircle },
                      { status: 'preparing', label: 'Preparing', icon: ChefHat },
                      { status: 'ready', label: 'Ready', icon: Package },
                      { status: 'picked_up', label: 'Out for Delivery', icon: Truck },
                      { status: 'delivered', label: 'Delivered', icon: CheckCircle },
                    ].map((step) => {
                      const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
                      const currentIndex = statusOrder.indexOf(order.status);
                      const stepIndex = statusOrder.indexOf(step.status);
                      const isCompleted = stepIndex <= currentIndex;
                      const isCurrent = stepIndex === currentIndex;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.status} className="relative flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                              isCompleted
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-orange-200' : ''}`}
                          >
                            <StepIcon size={20} />
                          </div>
                          <div className="flex-1">
                            <p
                              className={`font-semibold ${
                                isCompleted ? 'text-gray-900' : 'text-gray-400'
                              }`}
                            >
                              {step.label}
                            </p>
                            {isCurrent && order.estimated_delivery_time && step.status === 'delivered' && (
                              <p className="text-xs text-gray-600">
                                ETA: {new Date(order.estimated_delivery_time).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Live Tracking */}
            {order.status === 'picked_up' && order.driver && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Navigation className="text-primary" size={20} />
                  Live Tracking
                </h3>
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>{order.driver.full_name}</strong> is delivering your order
                  </p>
                  {order.driver.phone && (
                    <button
                      onClick={() => contactViaWhatsApp(order.driver!.phone!, order.driver!.full_name)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                    >
                      <Phone size={18} />
                      Call Driver
                    </button>
                  )}
                  <div className="mt-3 p-3 bg-white rounded border">
                    <p className="text-xs text-gray-600 mb-1">Estimated Arrival</p>
                    {order.estimated_delivery_time && (
                      <p className="font-bold text-gray-900">
                        {new Date(order.estimated_delivery_time).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin className="text-primary" size={20} />
                Delivery Address
              </h3>
              <p className="text-gray-700 mb-2">{order.delivery_address}</p>
              <p className="text-sm text-gray-500">
                Distance: {order.delivery_distance_km.toFixed(1)} km from restaurant
              </p>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4">Order Items</h3>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div
                    key={index}
                    className="flex justify-between items-center py-3 border-b last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {item.is_veg !== undefined && (
                          <div
                            className={`w-4 h-4 border-2 ${
                              item.is_veg ? 'border-green-600' : 'border-red-600'
                            } flex items-center justify-center`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                item.is_veg ? 'bg-green-600' : 'bg-red-600'
                              }`}
                            />
                          </div>
                        )}
                        <p className="font-semibold text-gray-900">{item.name}</p>
                      </div>
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

            {/* Restaurant Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Store className="text-primary" size={20} />
                Restaurant Details
              </h3>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900">{order.merchants?.business_name}</p>
                {order.merchants?.address && (
                  <p className="text-sm text-gray-600 flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {order.merchants.address}
                  </p>
                )}
                {order.merchants?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-600" />
                    <a
                      href={`tel:${order.merchants.phone}`}
                      className="text-primary hover:underline"
                    >
                      {order.merchants.phone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item Total</span>
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
                  <span className="text-lg font-bold">Total Paid</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹{order.total_amount.toFixed(2)}
                  </span>
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
                        order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {order.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {order.estimated_delivery_time && order.status !== 'delivered' && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Estimated Delivery</p>
                    <p className="font-semibold text-sm">
                      {new Date(order.estimated_delivery_time).toLocaleString()}
                    </p>
                  </div>
                )}

                {order.actual_delivery_time && (
                  <div className="pt-3 border-t bg-green-50 -mx-6 px-6 py-3 rounded-b-xl">
                    <p className="text-xs text-green-600 mb-1">✓ Delivered At</p>
                    <p className="font-semibold text-sm text-green-700">
                      {new Date(order.actual_delivery_time).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowCancelModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6 mx-4">
            <h2 className="text-2xl font-bold mb-4 text-red-900">Cancel Order?</h2>

            {customerProfile && customerProfile.cancelled_orders_count >= 1 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-900">Warning!</p>
                    <p className="text-xs text-yellow-800">
                      You have already cancelled {customerProfile.cancelled_orders_count} order(s).
                      Multiple cancellations may mark your account as untrusted.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please tell us why you&lsquo;re cancelling
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select a reason</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Ordered by mistake">Ordered by mistake</option>
                <option value="Taking too long">Taking too long</option>
                <option value="Found better option">Found better option</option>
                <option value="Personal reasons">Personal reasons</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 font-semibold transition-colors"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling || !cancelReason}
                className="flex-1 bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
