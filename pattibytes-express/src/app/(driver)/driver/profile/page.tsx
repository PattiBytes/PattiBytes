'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Phone, Mail, Truck, Calendar } from 'lucide-react';
import Image from 'next/image';

export default function DriverProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        <div className="bg-white rounded-xl shadow p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
            {user.avatar_url ? (
              <div className="relative w-32 h-32">
                <Image
                  src={user.avatar_url}
                  alt={user.full_name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center">
                <span className="text-white text-4xl font-bold">
                  {user.full_name?.charAt(0) || 'D'}
                </span>
              </div>
            )}

            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
              <p className="text-gray-600 capitalize">{user.role}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
                user.approval_status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {user.approval_status === 'approved' ? 'Verified' : 'Pending Verification'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Mail className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Phone className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-semibold text-gray-900">{user.phone || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Truck className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Vehicle Type</p>
                <p className="font-semibold text-gray-900">Bike</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <Calendar className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="font-semibold text-gray-900">
                  {new Date(user.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => router.push('/driver/profile/edit')}
              className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold"
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
