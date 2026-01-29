'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Users, ChevronDown } from 'lucide-react';

export default function RoleSwitcher() {
  const { user } = useAuth();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const roles = [
    { value: 'customer', label: 'Customer View', icon: '🛒', path: '/customer/dashboard' },
    { value: 'merchant', label: 'Merchant View', icon: '🏪', path: '/merchant/dashboard' },
    { value: 'driver', label: 'Driver View', icon: '🚗', path: '/driver/dashboard' },
    { value: 'admin', label: 'Admin View', icon: '⚙️', path: '/admin/dashboard' },
    { value: 'superadmin', label: 'Superadmin View', icon: '👑', path: '/admin/superadmin' },
  ];

  // Only admins and superadmins can switch views
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return null;
  }

  const handleRoleSwitch = (path: string) => {
    router.push(path);
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors font-medium"
      >
        <Users size={18} />
        <span className="hidden md:inline">Switch View</span>
        <ChevronDown size={16} />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl py-2 z-30 border border-gray-200">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-xs text-gray-500 font-semibold">SWITCH TO</p>
            </div>
            {roles.map((role) => (
              <button
                key={role.value}
                onClick={() => handleRoleSwitch(role.path)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span className="text-2xl">{role.icon}</span>
                <span className="font-medium text-gray-700">{role.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
