/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { CartItem } from './cart';
import { notificationService } from './notifications';

export const orderService = {
  async createOrder(
    customerId: string,
    merchantId: string,
    items: CartItem[],
     
    deliveryAddress: any,
    paymentMethod: 'cod' | 'razorpay',
    specialInstructions?: string
  ) {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = subtotal < 100 ? 20 : 0;
    const tax = subtotal * 0.05; // 5% GST
    const total = subtotal + deliveryFee + tax;

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: customerId,
          merchant_id: merchantId,
          status: 'pending',
          items: items,
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          discount: 0,
          tip: 0,
          total,
          delivery_address: deliveryAddress,
          special_instructions: specialInstructions,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Send notifications
    await Promise.all([
      // Notify customer
      notificationService.createNotification(
        customerId,
        'Order Placed!',
        `Your order of ₹${total.toFixed(0)} has been placed successfully.`,
        'order_placed',
        { order_id: data.id }
      ),
      // Notify merchant
      notificationService.createNotification(
        merchantId,
        'New Order!',
        `You have a new order worth ₹${total.toFixed(0)}.`,
        'new_order',
        { order_id: data.id }
      ),
    ]);

    return data as Order;
  },

  async getOrder(orderId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        merchants (business_name, phone),
        profiles!orders_customer_id_fkey (full_name, phone)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  async getCustomerOrders(customerId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        merchants (business_name, logo_url)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  },

  async getMerchantOrders(merchantId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey (full_name, phone)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  },

  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    // Get order details for notifications
    const order = await this.getOrder(orderId);

    // Send notifications based on status
    const statusMessages: Record<string, string> = {
      confirmed: 'Your order has been confirmed by the restaurant.',
      preparing: 'Your order is being prepared.',
      ready: 'Your order is ready for pickup!',
      picked_up: 'Your order has been picked up by the delivery partner.',
      in_transit: 'Your order is on the way!',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'Your order has been cancelled.',
    };

    if (statusMessages[status]) {
      await notificationService.createNotification(
        order.customer_id,
        'Order Update',
        statusMessages[status],
        'order_status',
        { order_id: orderId, status }
      );
    }

    return data;
  },

  async cancelOrder(orderId: string, reason: string) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        special_instructions: `Cancelled: ${reason}`,
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;

    const order = await this.getOrder(orderId);

    await notificationService.createNotification(
      order.customer_id,
      'Order Cancelled',
      `Your order has been cancelled. ${reason}`,
      'order_cancelled',
      { order_id: orderId }
    );

    return data;
  },

  // Subscribe to order updates
  subscribeToOrder(orderId: string, callback: (order: any) => void) {
    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return channel;
  },

  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  },
};
