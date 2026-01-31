/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  ChefHat,
  Eye,
  Calendar,
  MapPin,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';

interface Order {
  id: string;
  order_number: number;
  merchant_id: string;
  items: any[];
  total_amount: number;
  status: string;
  created_at: string;
  delivery_address: string;
  merchant_name?: string;
}

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrders();

    // Real-time updates
    const subscription = supabase
      .channel('customer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${user.id}`,
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    try {
      // Get orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get merchant names for each order
      const ordersWithMerchants = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { data: merchant } = await supabase
            .from('merchants')
            .select('business_name')
            .eq('id', order.merchant_id)
            .single();

          return {
            ...order,
            merchant_name: merchant?.business_name || 'Restaurant',
          };
        })
      );

      setOrders(ordersWithMerchants);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: any = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock, label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: ChefHat, label: 'Confirmed' },
      preparing: { color: 'bg-purple-100 text-purple-800 border-purple-300', icon: ChefHat, label: 'Preparing' },
      ready: { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Package, label: 'Ready' },
      picked_up: { color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Truck, label: 'Out for Delivery' },
      delivered: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-300', icon: XCircle, label: 'Cancelled' },
    };
    return configs[status] || configs.pending;
  };

  if (loading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-4">No orders yet</p>
            <button
              onClick={() => router.push('/customer/dashboard')}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold"
            >
              Start Ordering
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {order.merchant_name}
                          </h3>
                          <div className={`px-3 py-1 rounded-full border-2 flex items-center gap-1 text-xs font-semibold ${statusConfig.color}`}>
                            <StatusIcon size={14} />
                            {statusConfig.label}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Order #{order.order_number} • {new Date(order.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {order.delivery_address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          ₹{order.total_amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                          {order.items?.slice(0, 3).map((item: any, index: number) => (
                            <span
                              key={index}
                              className="text-sm text-gray-700 bg-gray-100 px-3 py-1 rounded-full"
                            >
                              {item.name} × {item.quantity}
                            </span>
                          ))}
                          {order.items?.length > 3 && (
                            <span className="text-sm text-gray-600 px-3 py-1">
                              +{order.items.length - 3} more
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => router.push(`/customer/orders/${order.id}`)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors"
                        >
                          <Eye size={16} />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
