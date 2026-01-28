/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { Order } from '@/types';
import { cartService } from './cart';
import { notificationService } from './notifications';

export const orderService = {
  // Create order with notifications
  async createOrder(
    customerId: string,
    merchantId: string,
     
    items: any[],
    deliveryAddress: any,
    paymentMethod: string,
    specialInstructions?: string
  ): Promise<Order> {
    try {
      const subtotal = cartService.getTotal();
      const deliveryFee = 40; // Calculate based on distance
      const tax = subtotal * 0.05; // 5% tax
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
            delivery_address: deliveryAddress,
            payment_method: paymentMethod,
            payment_status: 'pending',
            status: 'pending',
            special_instructions: specialInstructions,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Send notifications
      await notificationService.notifyNewOrder(data.id, customerId, merchantId);

      // Clear cart
      cartService.clearCart();

      return data as Order;
    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  },

  // Update order status with notifications
  async updateOrderStatus(
    orderId: string,
    status: string,
    driverId?: string
  ): Promise<void> {
    try {
      // Get order details
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id, merchant_id, driver_id')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('Order not found');

      // Update status
      const updateData: any = { status };
      if (driverId) updateData.driver_id = driverId;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Send appropriate notifications based on status
      if (status === 'confirmed') {
        await notificationService.notifyOrderApproved(
          orderId,
          order.customer_id,
          order.merchant_id,
          driverId
        );
      } else if (status === 'ready') {
        await notificationService.notifyOrderReady(
          orderId,
          order.customer_id,
          order.driver_id
        );
      } else if (status === 'out_for_delivery') {
        // Get driver name
        const { data: driver } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', order.driver_id)
          .single();

        await notificationService.notifyDeliveryStarted(
          orderId,
          order.customer_id,
          driver?.full_name || 'Driver'
        );
      } else if (status === 'delivered') {
        await notificationService.notifyDelivered(
          orderId,
          order.customer_id,
          order.merchant_id
        );
      }
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  },

  // Get orders with pagination
  async getOrders(
    userId: string,
    role: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ orders: Order[]; total: number }> {
    try {
      let query = supabase.from('orders').select('*', { count: 'exact' });

      // Filter based on role
      if (role === 'customer') {
        query = query.eq('customer_id', userId);
      } else if (role === 'merchant') {
        query = query.eq('merchant_id', userId);
      } else if (role === 'driver') {
        query = query.eq('driver_id', userId);
      }

      // Filter by status if provided
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        orders: data as Order[],
        total: count || 0,
      };
    } catch (error) {
      console.error('Get orders error:', error);
      throw error;
    }
  },
};
