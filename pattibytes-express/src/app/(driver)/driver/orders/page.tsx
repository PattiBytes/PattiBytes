/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Package, MapPin, DollarSign, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { toast } from 'react-toastify';

interface DriverAssignment {
  id: string;
  order_id: string;
  status: string;
  assigned_at: string;
  orders: {
    id: string;
    order_number: number;
    total_amount: number;
    delivery_address: string;
    delivery_distance_km: number;
    status: string;
    created_at: string;
    merchants: {
      business_name: string;
      address: string;
      phone: string;
    };
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

export default function DriverOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pendingAssignments, setPendingAssignments] = useState<DriverAssignment[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    if (user.role !== 'driver') {
      router.push('/');
      return;
    }

    loadAssignments();
    loadActiveOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('driver-assignments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'driver_assignments',
          filter: `driver_id=eq.${user.id}`,
        },
        () => {
          loadAssignments();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('driver_assignments')
        .select(`
          *,
          orders (
            *,
            merchants (business_name, address, phone),
            profiles (full_name, phone)
          )
        `)
        .eq('driver_id', user.id)
        .eq('status', 'pending')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setPendingAssignments(data || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveOrders = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          merchants (business_name, address, phone),
          profiles (full_name, phone)
        `)
        .eq('driver_id', user.id)
        .in('status', ['picked_up', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveOrders(data || []);
    } catch (error) {
      console.error('Failed to load active orders:', error);
    }
  };

  const acceptOrder = async (assignmentId: string, orderId: string) => {
    try {
      // Update assignment
      const { error: assignError } = await supabase
        .from('driver_assignments')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (assignError) throw assignError;

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({ driver_id: user?.id, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (orderError) throw orderError;

      toast.success('Order accepted successfully!');
      loadAssignments();
      loadActiveOrders();
    } catch (error) {
      console.error('Failed to accept order:', error);
      toast.error('Failed to accept order');
    }
  };

  const rejectOrder = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('driver_assignments')
        .update({ status: 'rejected', responded_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;

      toast.success('Order rejected');
      loadAssignments();
    } catch (error) {
      console.error('Failed to reject order:', error);
      toast.error('Failed to reject order');
    }
  };

  const markAsPickedUp = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'picked_up', updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as picked up!');
      loadActiveOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order');
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order marked as delivered!');
      loadActiveOrders();
    } catch (error) {
      console.error('Failed to update order:', error);
      toast.error('Failed to update order');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Delivery Orders</h1>

        {/* Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Order Requests</h2>
            <div className="grid gap-4">
              {pendingAssignments.map((assignment) => (
                <div key={assignment.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">
                        Order #{assignment.orders.order_number}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(assignment.assigned_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        ₹{assignment.orders.total_amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {assignment.orders.delivery_distance_km.toFixed(1)} km
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <Package className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {assignment.orders.merchants.business_name}
                        </p>
                        <p className="text-sm text-gray-600">{assignment.orders.merchants.address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-semibold text-gray-900">{assignment.orders.profiles.full_name}</p>
                        <p className="text-sm text-gray-600">{assignment.orders.delivery_address}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptOrder(assignment.id, assignment.order_id)}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      Accept Order
                    </button>
                    <button
                      onClick={() => rejectOrder(assignment.id)}
                      className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={20} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Orders */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Deliveries</h2>
          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <Truck size={64} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No active deliveries</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-gray-900">Order #{order.order_number}</h3>
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold mt-2">
                        {order.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">₹{order.total_amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{order.delivery_distance_km.toFixed(1)} km</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <Package className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-semibold text-gray-900">{order.merchants.business_name}</p>
                        <p className="text-sm text-gray-600">{order.merchants.address}</p>
                        <a href={`tel:${order.merchants.phone}`} className="text-sm text-primary">
                          {order.merchants.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="text-gray-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="font-semibold text-gray-900">{order.profiles.full_name}</p>
                        <p className="text-sm text-gray-600">{order.delivery_address}</p>
                        <a href={`tel:${order.profiles.phone}`} className="text-sm text-primary">
                          {order.profiles.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  {order.status === 'ready' && (
                    <button
                      onClick={() => markAsPickedUp(order.id)}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Truck size={20} />
                      Mark as Picked Up
                    </button>
                  )}

                  {order.status === 'picked_up' && (
                    <button
                      onClick={() => markAsDelivered(order.id)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      Mark as Delivered
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
