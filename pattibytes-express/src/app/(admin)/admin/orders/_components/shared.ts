/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

// Types
export interface Order {
  id: string;
  order_number?: string | number | null;
  customer_id: string | null;
  merchant_id: string;
  driver_id?: string | null;
  items: any[];
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at?: string | null;
  customer_notes?: string | null;
  customer_phone?: string | null;
  profiles?: { full_name: string | null };
  merchants?: { business_name: string | null };
  customerName?: string;
}

export interface CustomOrderRequest {
  id: string;
  order_id?: string | null;
  customer_id: string;
  custom_order_ref: string;
  category?: string | null;
  description?: string | null;
  image_url?: string | null;
  items: any[];
  status: string;
  quoted_amount?: number | null;
  quote_message?: string | null;
  admin_notes?: string | null;
  delivery_address?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  total_amount?: number | null;
  delivery_fee?: number | null;
  payment_method?: string | null;
  customer_phone?: string | null;
  created_at: string;
  updated_at?: string | null;
  customerName?: string;
  customerPhone?: string;
}

export interface DriverRow {
  id: string;
  full_name: string | null;
  phone: string | null;
}

export interface AdminStats {
  total: number;
  active: number;
  completed: number;
  revenue: number;
  customTotal: number;
  customPending: number;
}

// Constants
export const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up'];
export const ALL_STATUSES    = ['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'cancelled'];
export const CUSTOM_STATUSES = ['pending', 'quoted', 'confirmed', 'processing', 'delivered', 'cancelled'];

// Helpers
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export function getTimeDiff(created: string, updated?: string | null): string {
  if (!updated) return '';
  const diff = new Date(updated).getTime() - new Date(created).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// DB helpers
export async function sendDbNotification(
  userId: string | null,
  title: string,
  message: string,
  type: string,
  data?: any,
): Promise<boolean> {
  if (!userId) return true;
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId, title, message, body: message,
      type, data: data ?? null, is_read: false,
      created_at: new Date().toISOString(),
    } as any);
    if (!error) return true;
  } catch { /* fallthrough */ }
  try {
    const { error } = await supabase.from('notifications').insert({
      userid: userId, title, body: message, message,
      type, data: data ?? null, isread: false,
      createdat: new Date().toISOString(),
    } as any);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('Notification insert failed:', e);
    return false;
  }
}

export async function loadAvailableDriversStrict(): Promise<DriverRow[]> {
  const { data: dp, error: dpErr } = await supabase
    .from('driver_profiles')
    .select('user_id,is_available,is_verified,profile_completed')
    .eq('is_available', true).eq('is_verified', true).eq('profile_completed', true);
  if (dpErr) throw dpErr;
  const ids = (dp || []).map((r: any) => r.user_id).filter(Boolean);
  if (!ids.length) return [];
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id,full_name,phone,role,approval_status,is_active')
    .in('id', ids).eq('role', 'driver')
    .eq('approval_status', 'approved').eq('is_active', true);
  if (pErr) throw pErr;
  return (profs || []).map((p: any) => ({
    id: p.id, full_name: p.full_name ?? null, phone: p.phone ?? null,
  }));
}

export async function upsertAssignments(orderId: string, driverIds: string[]) {
  const nowIso = new Date().toISOString();
  const rows = driverIds.map(driverId => ({
    order_id: orderId, driver_id: driverId, status: 'pending', assigned_at: nowIso,
  }));
  const { error } = await supabase
    .from('driver_assignments')
    .upsert(rows as any, { onConflict: 'order_id,driver_id' } as any);
  if (error) throw error;
}
