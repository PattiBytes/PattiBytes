import { router } from 'expo-router';
import { supabase } from './supabase';

export type UserRole = 'customer' | 'driver' | 'merchant' | 'admin' | 'superadmin';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export async function navigateAfterAuth(userId: string): Promise<void> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, approval_status, is_active, profile_completed')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    router.replace('/(auth)/login' as any);
    return;
  }

  const role       = (profile.role            ?? 'customer') as UserRole;
  const approval   = (profile.approval_status ?? 'approved') as ApprovalStatus;
  const isActive   = profile.is_active !== false;

  // Banned account
  if (!isActive) {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
    return;
  }

  const needsApproval = ['driver', 'merchant', 'admin', 'superadmin'].includes(role);

  if (needsApproval && approval === 'pending') {
    router.replace('/(auth)/pending-approval' as any);
    return;
  }

  if (needsApproval && approval === 'rejected') {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
    return;
  }

  // Route to panel
  switch (role) {
    case 'driver':
      router.replace('/(driver)/dashboard' as any);
      break;
    case 'merchant':
    case 'admin':
    case 'superadmin':
      router.replace('/(admin)/dashboard' as any);
      break;
    case 'customer':
    default:
      router.replace('/(customer)/dashboard' as any);
  }
}