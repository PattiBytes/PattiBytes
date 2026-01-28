'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { orderService } from '@/services/orders';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Order } from '@/types';
import { ArrowLeft, MapPin, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { RealtimeChannel } from '@supabase/supabase-js';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadOrder();
    }

    return () => {
      // Cleanup subscription on unmount
      if (channel) {
        channel.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, params.id]);

  let channel: RealtimeChannel | null = null;

  const loadOrder = async () => {
    try {
      const data = await orderService.getOrder(params.id as string);
      setOrder(data);

      // Subscribe to real-time updates
      channel = orderService.subscribeToOrder(params.id as string, (updatedOrder) => {
        setOrder(updatedOrder);
        toast.info(`Order status updated: ${updatedOrder.status}`);
      });
    } catch (error) {
      console.error('Failed to load order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusSteps = () => {
    const steps = [
      { label: 'Order Placed', status: 'pending' },
      { label: 'Confirmed', status: 'confirmed' },
      { label: 'Preparing', status: 'preparing' },
      { label: 'Ready', status: 'ready' },
      { label: 'Out for Delivery', status: 'out_for_delivery' },
      { label: 'Delivered', status: 'delivered' },
    ];

    const currentIndex = steps.findIndex((s) => s.status === order?.status);
    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 bg-white rounded-lg">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order not found</h2>
            <button
              onClick={() => router.back()}
              className="text-primary hover:text-orange-600 font-medium"
            >
              ← Go back
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            Back to Orders
          </button>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
            {order.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-primary">₹{order.total}</p>
              <p className="text-sm text-gray-600">Payment: {order.payment_method}</p>
            </div>
          </div>

          {/* Status Timeline */}
          <div className="mt-8">
            <h3 className="font-bold text-gray-900 mb-4">Order Status</h3>
            <div className="flex items-center justify-between">
              {getStatusSteps().map((step, index) => (
                <div key={step.status} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        step.completed
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {step.completed ? '✓' : index + 1}
                    </div>
                    <p className={`text-xs mt-2 text-center ${step.completed ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                  </div>
                  {index < getStatusSteps().length - 1 && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-0.5 ${
                        step.completed ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Order Items</h3>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package size={24} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-bold text-gray-900">₹{item.price * item.quantity}</p>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="font-medium">₹{order.delivery_fee}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">₹{order.tax}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span className="text-primary">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin size={20} />
            Delivery Address
          </h3>
          <p className="text-gray-700">{order.delivery_address.address}</p>
          {order.special_instructions && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Special Instructions:</p>
              <p className="text-sm text-blue-800 mt-1">{order.special_instructions}</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
