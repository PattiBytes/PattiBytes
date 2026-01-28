/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export const orderService = {
  async createOrder(
    customerId: string,
    merchantId: string,
    items: any[],
    deliveryAddress: any,
    paymentMethod: string,
    specialInstructions?: string
  ): Promise<Order> {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = 40;
    const tax = subtotal * 0.05;
    const total = subtotal + deliveryFee + tax;

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: customerId,
          merchant_id: merchantId,
          items,
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          total,
          status: 'pending',
          delivery_address: deliveryAddress,
          payment_method: paymentMethod,
          special_instructions: specialInstructions,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Order;
  },

  async getOrder(orderId: string): Promise<Order> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data as Order;
  },

  async updateOrderStatus(orderId: string, status: string, driverId?: string): Promise<void> {
    const updateData: any = { status };
    if (driverId) updateData.driver_id = driverId;

    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (error) throw error;
  },

  async getOrders(userId: string, role: string, status?: string): Promise<Order[]> {
    let query = supabase.from('orders').select('*');

    if (role === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (role === 'merchant') {
      query = query.eq('merchant_id', userId);
    } else if (role === 'driver') {
      query = query.eq('driver_id', userId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return data as Order[];
  },

  async getMerchantOrders(merchantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  },

  subscribeToOrder(orderId: string, callback: (order: Order) => void): RealtimeChannel {
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          callback(payload.new as Order);
        }
      )
      .subscribe();

    return channel;
  },
};
