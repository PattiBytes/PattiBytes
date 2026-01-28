'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Order } from '@/types';
import { Package, MapPin, Phone, Navigation } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { orderService } from '@/services/orders';

export default function DriverOrdersPage() {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'my'>('available');

  useEffect(() => {
    if (user) {
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      if (tab === 'available') {
        // Load orders ready for pickup
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('status', 'ready')
          .is('driver_id', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailableOrders(data as Order[]);
      } else {
        // Load my orders
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('driver_id', user!.id)
          .in('status', ['ready', 'out_for_delivery'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMyOrders(data as Order[]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await orderService.updateOrderStatus(orderId, 'out_for_delivery', user!.id);
      toast.success('Order accepted! Navigate to pickup location');
      loadOrders();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    if (!confirm('Confirm order delivery?')) return;

    try {
      await orderService.updateOrderStatus(orderId, 'delivered');
      toast.success('Order marked as delivered!');
      loadOrders();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to mark as delivered');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Delivery Orders</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('available')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              tab === 'available'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Available Orders ({availableOrders.length})
          </button>
          <button
            onClick={() => setTab('my')}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              tab === 'my'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            My Orders ({myOrders.length})
          </button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(tab === 'available' ? availableOrders : myOrders).length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <Package size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {tab === 'available' ? 'No orders available' : 'No active deliveries'}
                </h2>
                <p className="text-gray-600">
                  {tab === 'available' 
                    ? 'Check back soon for new orders' 
                    : 'Accept orders from the available tab'}
                </p>
              </div>
            ) : (
              (tab === 'available' ? availableOrders : myOrders).map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">₹{order.total}</p>
                      <p className="text-sm text-gray-600">Earn: ₹{order.delivery_fee}</p>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2 mb-3">
                      <MapPin size={20} className="text-gray-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900 mb-1">Delivery Address</p>
                        <p className="text-sm text-gray-600">{order.delivery_address.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <p className="font-medium text-gray-900 mb-2">{order.items.length} Items</p>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-sm text-gray-600">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-gray-500">+{order.items.length - 3} more items</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {tab === 'available' ? (
                      <>
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-orange-600 font-medium"
                        >
                          Accept Order
                        </button>
                        <button className="bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2">
                          <Navigation size={18} />
                          Directions
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleMarkDelivered(order.id)}
                          className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 font-medium"
                        >
                          Mark as Delivered
                        </button>
                        <button className="bg-blue-50 text-blue-600 px-4 py-3 rounded-lg hover:bg-blue-100 font-medium flex items-center gap-2">
                          <Phone size={18} />
                          Call Customer
                        </button>
                      </>
                    )}
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
