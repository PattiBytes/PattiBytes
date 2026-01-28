export interface AdminPermission {
  id: string;
  user_id: string;
  permission: string;
  granted_by: string;
  created_at: string;
}

export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type?: string;
  target_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: any;
  ip_address?: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  description?: string;
  updated_by?: string;
  updated_at: string;
}

export type AdminAction =
  | 'user_banned'
  | 'user_unbanned'
  | 'merchant_approved'
  | 'merchant_rejected'
  | 'driver_approved'
  | 'driver_rejected'
  | 'order_refunded'
  | 'setting_updated'
  | 'admin_created'
  | 'permission_granted'
  | 'permission_revoked';
