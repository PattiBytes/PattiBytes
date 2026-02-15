/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

/**
 * Send notification - handles NULL user_id for walk-in orders
 * Returns true on success, false on failure (doesn't throw)
 */
export async function sendNotification(
  userId: string | null,
  title: string,
  message: string,
  type: string,
  data?: any
): Promise<boolean> {
  // ✅ Skip if no user_id (walk-in orders)
  if (!userId) {
    console.log('⚠️ Skipping notification: No user_id (walk-in order)');
    return true; // Return true to not break the flow
  }

  try {
    // Try newer schema first (with body field)
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      body: message,
      type,
      data: data ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    } as any);

    if (!error) return true;

    // Fallback to older schema (without body field)
    const { error: error2 } = await supabase.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      data: data ?? null,
      is_read: false,
      created_at: new Date().toISOString(),
    } as any);

    if (error2) throw error2;
    return true;
  } catch (e: any) {
    console.error('Notification error:', {
      message: e?.message,
      code: e?.code,
      details: e?.details,
    });
    return false; // ✅ Don't throw, just return false
  }
}

/**
 * Get customer display name from order
 * Handles both regular and walk-in customers
 */
export function getCustomerDisplayName(
  order: { customer_notes?: string | null; customer_id?: string | null },
  customer?: { fullname?: string | null; full_name?: string | null } | null
): string {
  // Regular customer with profile
  if (order.customer_id && customer) {
    return customer.fullname || customer.full_name || 'Customer';
  }

  // Walk-in customer - extract name from customer_notes
  if (order.customer_notes) {
    const notes = order.customer_notes;
    if (notes.includes('Walk-in:')) {
      return notes.replace('Walk-in:', '').split('\n')[0].trim();
    }
    return notes.split('\n')[0].trim() || 'Walk-in Customer';
  }

  return 'Walk-in Customer';
}

/**
 * Check if order is walk-in
 */
export function isWalkInOrder(order: { customer_id?: string | null }): boolean {
  return !order.customer_id;
}
