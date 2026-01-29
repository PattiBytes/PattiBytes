import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { superadminService } from '@/services/superadmin';

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setIsAdmin(user.role === 'admin' || user.role === 'superadmin');
      setIsSuperAdmin(user.role === 'superadmin');
      loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadPermissions = async () => {
    if (!user) return;
    
    try {
      const perms = await superadminService.getAdminPermissions(user.id);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (isSuperAdmin) return true; // Superadmin has all permissions
    return permissions.includes(permission) || permissions.includes('*');
  };

  return {
    isAdmin,
    isSuperAdmin,
    permissions,
    hasPermission,
    promoteToAdmin: superadminService.promoteToAdmin,
    demoteAdmin: superadminService.demoteAdmin,
    grantPermission: superadminService.grantPermission,
    revokePermission: superadminService.revokePermission,
    updateAdminRole: superadminService.updateAdminRole,
    deleteAdmin: superadminService.deleteAdmin,
  };
};
