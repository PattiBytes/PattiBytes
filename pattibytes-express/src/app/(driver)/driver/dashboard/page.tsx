/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Package, Clock, CheckCircle, TrendingUp, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';

interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  total: number;
  status: string;
  delivery_address: any;
  created_at: string;
}

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    available: 0,
    inProgress: 0,
    completed: 0,
    earnings: 0,
  });
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDashboard = async () => {
    try {
      // Load available orders (ready for pickup)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'ready_for_pickup')
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(10);

      if (availableError) throw availableError;
      setAvailableOrders(available || []);

      // Load current order (assigned to this driver)
      const { data: current, error: currentError } = await supabase
        .from('orders')
        .select('*')
        .eq('driver_id', user?.id)
        .in('status', ['assigned', 'picked_up'])
        .single();

      if (currentError && currentError.code !== 'PGRST116') throw currentError;
      setCurrentOrder(current);

      // Load stats
      const { data: completed, error: completedError } = await supabase
        .from('orders')
        .select('total')
        .eq('driver_id', user?.id)
        .eq('status', 'delivered');

      if (completedError) throw completedError;

      const totalEarnings = completed?.reduce((sum: number, order: { total: number; }) => sum + (order.total * 0.1), 0) || 0;

      setStats({
        available: available?.length || 0,
        inProgress: current ? 1 : 0,
        completed: completed?.length || 0,
        earnings: totalEarnings,
      });
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          driver_id: user?.id,
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order accepted!');
      loadDashboard();
    } catch (error: any) {
      console.error('Failed to accept order:', error);
      toast.error(error.message || 'Failed to accept order');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Status updated!');
      loadDashboard();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Driver'}!
          </h1>
          <p className="text-gray-600 mt-1">Ready to deliver some orders?</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package size={32} />
              <span className="text-3xl font-bold">{stats.available}</span>
            </div>
            <p className="text-blue-100">Available Orders</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock size={32} />
              <span className="text-3xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="text-orange-100">In Progress</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle size={32} />
              <span className="text-3xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-green-100">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={32} />
              <span className="text-3xl font-bold">₹{stats.earnings.toFixed(0)}</span>
            </div>
            <p className="text-purple-100">Total Earnings</p>
          </div>
        </div>

        {/* Current Order */}
        {currentOrder && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-2 border-primary">
            <h2 className="text-2xl font-bold mb-4 text-primary">Current Delivery</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-bold">#{currentOrder.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-bold text-primary">₹{currentOrder.total}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Delivery Address</p>
                <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                  <MapPin size={20} className="text-primary flex-shrink-0 mt-1" />
                  <p className="font-medium">
                    {currentOrder.delivery_address?.address || 'No address'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {currentOrder.status === 'assigned' && (
                  <button
                    onClick={() => handleUpdateStatus(currentOrder.id, 'picked_up')}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold"
                  >
                    Mark as Picked Up
                  </button>
                )}
                {currentOrder.status === 'picked_up' && (
                  <button
                    onClick={() => handleUpdateStatus(currentOrder.id, 'delivered')}
                    className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Available Orders</h2>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : availableOrders.length > 0 ? (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="font-bold text-lg">#{order.id.slice(0, 8)}</span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                          ₹{order.total}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{order.delivery_address?.address || 'No address'}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(order.created_at).toLocaleTimeString('en-IN')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-orange-600 font-medium"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No orders available</h3>
              <p className="text-gray-600">Check back soon for new delivery opportunities</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
