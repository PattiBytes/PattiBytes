'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Shield, Users, Settings } from 'lucide-react';

export default function SuperadminPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== 'superadmin') {
      router.push('/admin/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'superadmin') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Super Admin Panel</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <Shield className="text-purple-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">Admin Management</h3>
            <p className="text-sm text-gray-600 mt-2">
              Promote users and manage admin roles
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <Users className="text-blue-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">User Control</h3>
            <p className="text-sm text-gray-600 mt-2">
              Full control over all platform users
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <Settings className="text-orange-500 mb-3" size={32} />
            <h3 className="font-semibold text-gray-900 text-lg">System Settings</h3>
            <p className="text-sm text-gray-600 mt-2">
              Configure platform-wide settings
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
