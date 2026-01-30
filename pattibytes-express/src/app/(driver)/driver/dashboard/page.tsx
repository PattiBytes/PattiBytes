/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Package, Clock, CheckCircle, TrendingUp, MapPin, Truck, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';
import Link from 'next/link';

interface Order {
  id: string;
  customer_id: string;
  merchant_id: string;
  total: number;
  status: string;
  delivery_address: any;
  created_at: string;
  merchant?: {
    name: string;
  };
  customer?: {
    full_name: string;
    phone: string;
  };
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
  const [hasDriver, setHasDriver] = useState(false);
  const [creating, setCreating] = useState(false);
  const [, setDriverId] = useState<string>('');

  useEffect(() => {
    if (user) {
      checkDriverProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (hasDriver) {
      loadDashboard();

      // Set up real-time subscription
      const channel = supabase
        .channel('driver_orders')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          () => {
            logger.info('Order changed, reloading...');
            loadDashboard();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDriver]);

  const checkDriverProfile = async () => {
    try {
      const { data: driverData, error } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) {
        logger.error('Error checking driver profile', error);
      }

      if (!driverData) {
        setHasDriver(false);
        setLoading(false);
        return;
      }

      setHasDriver(true);
      setDriverId(driverData.id);
    } catch (error) {
      logger.error('Failed to check driver profile', error);
      setLoading(false);
    }
  };

  const handleCreateDriver = async () => {
    setCreating(true);
    try {
      const driverData: any = {
        user_id: user!.id,
      };

      if (user!.full_name) driverData.name = user!.full_name;
      if (user!.email) driverData.email = user!.email;
      if (user!.phone) driverData.phone = user!.phone;

      const { data, error } = await supabase
        .from('drivers')
        .insert(driverData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating driver', error);
        throw error;
      }

      toast.success('Driver profile created! You can now start accepting orders.');
      setHasDriver(true);
      setDriverId(data.id);
      loadDashboard();
    } catch (error: any) {
      logger.error('Error creating driver', error);
      toast.error(error.message || 'Failed to create driver profile');
    } finally {
      setCreating(false);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // Load available orders (ready for pickup)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          merchant:merchants!orders_merchant_id_fkey(name),
          customer:profiles!orders_customer_id_fkey(full_name, phone)
        `)
        .eq('status', 'ready_for_pickup')
        .is('driver_id', null)
        .order('created_at', { ascending: true })
        .limit(10);

      if (availableError) {
        logger.error('Error loading available orders', availableError);
      } else {
        setAvailableOrders(available || []);
      }

      // Load current order (assigned to this driver)
      const { data: current, error: currentError } = await supabase
        .from('orders')
        .select(`
          *,
          merchant:merchants!orders_merchant_id_fkey(name),
          customer:profiles!orders_customer_id_fkey(full_name, phone)
        `)
        .eq('driver_id', user?.id)
        .in('status', ['assigned', 'picked_up'])
        .maybeSingle();

      if (currentError && currentError.code !== 'PGRST116') {
        logger.error('Error loading current order', currentError);
      } else {
        setCurrentOrder(current);
      }

      // Load today's stats
      const today = new Date().toISOString().split('T')[0];
      
      const { data: completed, error: completedError } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('driver_id', user?.id)
        .eq('status', 'delivered')
        .gte('created_at', today);

      if (completedError) {
        logger.error('Error loading completed orders', completedError);
      }

      // Calculate earnings (10% commission)
      const totalEarnings = completed?.reduce((sum: number, order: { total: number }) => 
        sum + (order.total * 0.1), 0
      ) || 0;

      setStats({
        available: available?.length || 0,
        inProgress: current ? 1 : 0,
        completed: completed?.length || 0,
        earnings: totalEarnings,
      });
    } catch (error) {
      logger.error('Failed to load dashboard', error);
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
        .eq('id', orderId)
        .eq('status', 'ready_for_pickup'); // Ensure order is still available

      if (error) throw error;

      toast.success('Order accepted! Head to the restaurant to pick it up.');
      loadDashboard();
    } catch (error: any) {
      logger.error('Failed to accept order', error);
      toast.error(error.message || 'Failed to accept order. It may have been taken by another driver.');
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

      const messages = {
        picked_up: 'Order picked up! Head to delivery location.',
        delivered: 'Order delivered! Great job! 🎉',
      };

      toast.success(messages[newStatus as keyof typeof messages] || 'Status updated!');
      loadDashboard();
    } catch (error: any) {
      logger.error('Failed to update status', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  // Show create driver profile screen
  if (!loading && !hasDriver) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Truck className="mx-auto text-primary mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Become a Delivery Partner</h1>
            <p className="text-gray-600 mb-8">
              You don&apos;t have a driver profile yet. Create one to start accepting delivery orders and earning money.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-blue-500 flex-shrink-0 mt-1" size={20} />
                <div className="text-left">
                  <h3 className="font-semibold text-blue-900 mb-1">What you&apos;ll get:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Flexible work schedule</li>
                    <li>• Earn 10% commission on each delivery</li>
                    <li>• Real-time order notifications</li>
                    <li>• Easy earnings tracking</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={handleCreateDriver}
              disabled={creating}
              className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              {creating ? 'Creating Profile...' : 'Create Driver Profile'}
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0] || 'Driver'}! 👋
          </h1>
          <p className="text-gray-600 mt-1">Ready to deliver some orders?</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Package className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.available}</span>
            </div>
            <p className="text-blue-100 text-sm">Available Orders</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Clock className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.inProgress}</span>
            </div>
            <p className="text-orange-100 text-sm">In Progress</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-green-100 text-sm">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-4 md:p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="flex-shrink-0" size={28} />
              <span className="text-2xl md:text-3xl font-bold">₹{stats.earnings.toFixed(0)}</span>
            </div>
            <p className="text-purple-100 text-sm">Today&apos;s Earnings</p>
          </div>
        </div>

        {/* Current Order */}
        {currentOrder && (
          <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-lg shadow-lg p-6 mb-8 border-2 border-primary">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <h2 className="text-xl md:text-2xl font-bold text-primary">Active Delivery</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Order ID</p>
                  <p className="font-bold text-sm">#{currentOrder.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Amount</p>
                  <p className="font-bold text-primary text-sm">₹{currentOrder.total}</p>
                </div>
              </div>

              {currentOrder.merchant && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Restaurant</p>
                  <p className="font-semibold text-sm">{currentOrder.merchant.name}</p>
                </div>
              )}

              {currentOrder.customer && (
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-1">Customer</p>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{currentOrder.customer.full_name}</p>
                    <a 
                      href={`tel:${currentOrder.customer.phone}`}
                      className="text-primary hover:text-orange-600 text-sm font-medium"
                    >
                      📞 Call
                    </a>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-2">Delivery Address</p>
                <div className="flex items-start gap-2">
                  <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <p className="font-medium text-sm">
                    {currentOrder.delivery_address?.address || 'No address provided'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {currentOrder.status === 'assigned' && (
                  <button
                    onClick={() => handleUpdateStatus(currentOrder.id, 'picked_up')}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition-colors"
                  >
                    ✅ Mark as Picked Up
                  </button>
                )}
                {currentOrder.status === 'picked_up' && (
                  <button
                    onClick={() => handleUpdateStatus(currentOrder.id, 'delivered')}
                    className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-semibold transition-colors"
                  >
                    🎉 Mark as Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Available Orders */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold">Available Orders</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
              {stats.available} Available
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : availableOrders.length > 0 ? (
            <div className="space-y-4">
              {availableOrders.map((order) => (
                <div 
                  key={order.id} 
                  className="border-2 border-gray-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-3">
                        <span className="font-bold text-base md:text-lg">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-semibold">
                          ₹{order.total} • Earn ₹{(order.total * 0.1).toFixed(0)}
                        </span>
                      </div>

                      {order.merchant && (
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-semibold">From:</span> {order.merchant.name}
                        </p>
                      )}

                      <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                        <MapPin size={16} className="flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">
                          {order.delivery_address?.address || 'No address provided'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>

                    <button
                      onClick={() => handleAcceptOrder(order.id)}
                      className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold transition-colors whitespace-nowrap"
                    >
                      Accept Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package size={64} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">No orders available</h3>
              <p className="text-gray-600 mb-6">Check back soon for new delivery opportunities</p>
              <Link
                href="/customer/dashboard"
                className="inline-flex items-center gap-2 text-primary hover:text-orange-600 font-medium"
              >
                Browse restaurants while you wait →
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
