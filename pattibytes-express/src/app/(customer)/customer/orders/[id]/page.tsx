'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { orderService } from '@/services/orders';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { ArrowLeft, MapPin, Phone, CheckCircle, Package, Bike, Home } from 'lucide-react';
import { toast } from 'react-toastify';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await orderService.getOrder(params.id as string);
        setOrder(data);

        // Subscribe to real-time updates
        const channel = orderService.subscribeToOrder(params.id as string, (updatedOrder) => {
          setOrder(updatedOrder);
          toast.info(`Order ${updatedOrder.status}`);
        });

        return () => {
          orderService.unsubscribe(channel);
        };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        toast.error('Failed to load order');
        router.push('/customer/orders');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [params.id, router]);

  const getOrderTimeline = () => {
    const statuses = [
      { key: 'pending', label: 'Order Placed', icon: CheckCircle },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
      { key: 'preparing', label: 'Preparing', icon: Package },
      { key: 'ready', label: 'Ready', icon: CheckCircle },
      { key: 'picked_up', label: 'Picked Up', icon: Bike },
      { key: 'in_transit', label: 'On the Way', icon: Bike },
      { key: 'delivered', label: 'Delivered', icon: Home },
    ];

    const currentIndex = statuses.findIndex((s) => s.key === order?.status);

    return statuses.map((status, index) => ({
      ...status,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) return null;

  const timeline = getOrderTimeline();

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-700 hover:text-primary mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Orders</span>
        </button>

        {/* Order Status Timeline */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Order Status</h2>

          <div className="relative">
            {timeline.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.key} className="flex gap-4 mb-8 last:mb-0">
                  {/* Line */}
                  {index < timeline.length - 1 && (
                    <div
                      className={`absolute left-4 top-10 w-0.5 h-8 ${
                        step.completed ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                  )}

                  {/* Icon */}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.completed
                        ? 'bg-green-500 text-white'
                        : step.active
                        ? 'bg-primary text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    <Icon size={16} />
                  </div>

                  {/* Label */}
                  <div className="flex-1 pt-1">
                    <p
                      className={`font-medium ${
                        step.completed || step.active ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.active && (
                      <p className="text-sm text-gray-600 mt-1">Current status</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Restaurant Details</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{order.merchants?.business_name}</p>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <Phone size={16} />
                <span>{order.merchants?.phone || 'N/A'}</span>
              </div>
            </div>
            <a
              href={`tel:${order.merchants?.phone}`}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600"
            >
              Call Restaurant
            </a>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-3">
            {Array.isArray(order.items) &&
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    ₹{(item.price * item.quantity).toFixed(0)}
                  </p>
                </div>
              ))}
          </div>

          {/* Bill Details */}
          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Subtotal</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Delivery Fee</span>
              <span>{order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>GST (5%)</span>
              <span>₹{order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
              <span>Total</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Address</h2>
          <div className="flex items-start gap-3">
            <MapPin className="text-primary mt-1" size={20} />
            <p className="text-gray-700">{order.delivery_address?.address || 'N/A'}</p>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Information</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900 capitalize">
                {order.payment_method.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-600 capitalize">Status: {order.payment_status}</p>
            </div>
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
              ₹{order.total.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-2">Need help with your order?</p>
          <a
            href="tel:+911234567890"
            className="text-primary font-semibold hover:underline"
          >
            Call Support: +91 123 456 7890
          </a>
        </div>
      </div>
    </DashboardLayout>
  );
}
