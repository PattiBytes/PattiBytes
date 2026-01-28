'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { superadminService } from '@/services/superadmin';

export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSuperAdmin(user.role === 'superadmin');
      setIsAdmin(user.role === 'admin' || user.role === 'superadmin');
    }
  }, [user]);

  const hasPermission = () => {
    return isSuperAdmin;
  };

  return {
    isSuperAdmin,
    isAdmin,
    hasPermission,
    promoteToAdmin: superadminService.promoteToAdmin,
    demoteAdmin: superadminService.demoteAdmin,
    grantPermission: superadminService.grantPermission,
    revokePermission: superadminService.revokePermission,
    getSettings: superadminService.getSettings,
    updateSetting: superadminService.updateSetting,
    getActivityLogs: superadminService.getActivityLogs,
    getPlatformStats: superadminService.getPlatformStats,
    banUser: superadminService.banUser,
    unbanUser: superadminService.unbanUser,
  };
}

// Default export for convenience
export default useSuperAdmin;
