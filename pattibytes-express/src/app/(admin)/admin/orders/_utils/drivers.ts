/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';
import type { DriverRow } from '../_types';

export async function loadAvailableDriversStrict(): Promise<DriverRow[]> {
  const { data: dp, error } = await supabase
    .from('driver_profiles')
    .select('user_id')
    .eq('is_available', true)
    .eq('is_verified', true)
    .eq('profile_completed', true);
  if (error) throw error;

  const ids = (dp ?? []).map((r: any) => r.user_id).filter(Boolean);
  if (!ids.length) return [];

  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id,full_name,phone')
    .in('id', ids)
    .eq('role', 'driver')
    .eq('approval_status', 'approved')
    .eq('is_active', true);
  if (pErr) throw pErr;

  return (profs ?? []).map((p: any) => ({ id: p.id, full_name: p.full_name ?? null, phone: p.phone ?? null }));
}

export async function upsertDriverAssignments(orderId: string, driverIds: string[]) {
  const now  = new Date().toISOString();
  const rows = driverIds.map(id => ({ order_id: orderId, driver_id: id, status: 'pending', assigned_at: now }));
  const { error } = await supabase
    .from('driver_assignments')
    .upsert(rows as any, { onConflict: 'order_id,driver_id' } as any);
  if (error) throw error;
}
