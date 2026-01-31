'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Package,
  Truck,
  CheckCircle,
  MapPin,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Clock,
  Eye,
  Navigation,
} from 'lucide-react';
import { PageLoadingSpinner } from '@/components/common/LoadingSpinner';
import { toast } from 'react-toastify';

interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  total_amount: number;
  status: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_distance_km: number;
  created_at: string;
  profiles?: {
    full_name: string;
    phone?: string;
  };
  merchants?: {
    business_name: string;
    address?: string;
    phone?: string;
  };
}

export default function DriverOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'my'>('available');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('driver-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
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
      // Load available orders (ready for pickup, no driver assigned)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (full_name, phone),
          merchants:merchant_id (business_name, address, phone)
        `)
        .eq('status', 'ready')
        .is('driver_id', null)
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;

      setAvailableOrders(available || []);

      // Load my assigned orders
      const { data: assigned, error: assignedError } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:customer_id (full_name, phone),
          merchants:merchant_id (business_name, address, phone)
        `)
        .eq('driver_id', user.id)
        .in('status', ['picked_up'])
        .order('created_at', { ascending: false });

      if (assignedError) throw assignedError;

      setMyOrders(assigned || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_id: user!.id,
          status: 'picked_up',
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order accepted!');
      loadOrders();
      setTab('my');
    } catch (error) {
      console.error('Failed to accept order:', error);
      toast.error('Failed to accept order');
    }
  };

  const markAsDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'delivered',
          actual_delivery_time: new Date().toISOString(),
          payment_status: 'paid',
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order delivered!');
      loadOrders();
    } catch (error) {
      console.error('Failed to mark as delivered:', error);
      toast.error('Failed to update order');
    }
  };

  const openNavigation = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  };

  if (loading) return <PageLoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Delivery Orders</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('available')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              tab === 'available'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Available Orders ({availableOrders.length})
          </button>
          <button
            onClick={() => setTab('my')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              tab === 'my'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            My Deliveries ({myOrders.length})
          </button>
        </div>

        {/* Available Orders */}
        {tab === 'available' && (
          <div className="space-y-4">
            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Package size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No available orders at the moment</p>
              </div>
            ) : (
              availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {order.merchants?.business_name}
                      </h3>
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                        <MapPin size={16} className="mt-1 flex-shrink-0" />
                        <div>
                          <p className="font-medium">Pickup: {order.merchants?.address}</p>
                          <p className="mt-1">Deliver to: {order.delivery_address}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Distance: {order.delivery_distance_km?.toFixed(1) || 'N/A'} km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ₹{order.total_amount?.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptOrder(order.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                    >
                      <Truck size={18} />
                      Accept Delivery
                    </button>
                    <button
                      onClick={() => router.push(`/driver/orders/${order.id}`)}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                    >
                      <Eye size={18} />
                      Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* My Orders */}
        {tab === 'my' && (
          <div className="space-y-4">
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <Truck size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No active deliveries</p>
              </div>
            ) : (
              myOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow-md p-6 border-2 border-primary"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Deliver to: {order.profiles?.full_name}
                      </h3>
                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                        <MapPin size={16} className="mt-1 flex-shrink-0" />
                        <p>{order.delivery_address}</p>
                      </div>
                      {order.profiles?.phone && (
                        <a
                          href={`tel:${order.profiles.phone}`}
                          className="text-sm text-primary font-semibold hover:underline"
                        >
                          Call Customer: {order.profiles.phone}
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ₹{order.total_amount?.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">COD</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openNavigation(order.delivery_latitude, order.delivery_longitude)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                    >
                      <Navigation size={18} />
                      Navigate
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Confirm order delivery?')) {
                          markAsDelivered(order.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                    >
                      <CheckCircle size={18} />
                      Mark Delivered
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
