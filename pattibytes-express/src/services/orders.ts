/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import { notificationService } from './notifications';

export interface OrderItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  special_instructions?: string;
}

export interface CreateOrderData {
  customer_id: string;
  merchant_id: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_distance_km?: number;
  customer_phone?: string;
  special_instructions?: string;
  promo_code?: string;
  status?: string;
}

export interface Order extends CreateOrderData {
  id: string;
  created_at: string;
  updated_at: string;
}

class OrderService {
  subscribeToOrder: any;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getOrder(arg0: string) {
    throw new Error('Method not implemented.');
  }
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    try {
      console.log('📝 Creating order with data:', orderData);

      // Prepare the order data - ensure all required fields
      const insertData = {
        customer_id: orderData.customer_id,
        merchant_id: orderData.merchant_id,
        items: orderData.items,
        subtotal: orderData.subtotal,
        discount: orderData.discount || 0,
        delivery_fee: orderData.delivery_fee,
        tax: orderData.tax,
        total_amount: orderData.total_amount,
        payment_method: orderData.payment_method,
        payment_status: orderData.payment_status || 'pending',
        delivery_address: orderData.delivery_address,
        delivery_latitude: orderData.delivery_latitude,
        delivery_longitude: orderData.delivery_longitude,
        delivery_distance_km: orderData.delivery_distance_km,
        customer_phone: orderData.customer_phone,
        special_instructions: orderData.special_instructions,
        promo_code: orderData.promo_code || null,
        status: orderData.status || 'pending',
      };

      console.log('📤 Sending to database:', insertData);

      const { data, error } = await supabase
        .from('orders')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        throw new Error(error.message || 'Failed to create order');
      }

      if (!data) {
        throw new Error('No data returned from order creation');
      }

      console.log('✅ Order created:', data);

      // Send notifications
      try {
        await notificationService.sendOrderNotification(data.id, 'pending');
      } catch (notifError) {
        console.warn('Failed to send notification:', notifError);
      }

      return data as Order;
    } catch (error: any) {
      console.error('❌ Failed to create order:', error);
      throw error;
    }
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as Order;
    } catch (error) {
      console.error('Failed to get order:', error);
      return null;
    }
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as Order[]) || [];
    } catch (error) {
      console.error('Failed to get customer orders:', error);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification
      await notificationService.sendOrderNotification(orderId, status);

      return true;
    } catch (error) {
      console.error('Failed to update order status:', error);
      return false;
    }
  }

  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          special_instructions: reason
            ? `Cancelled: ${reason}`
            : 'Cancelled by customer',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      await notificationService.sendOrderNotification(orderId, 'cancelled');

      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }
}

export const orderService = new OrderService();
