/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { User, Mail, Phone, Lock, Briefcase, Bike, CheckCircle, Clock, XCircle, Save } from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
}

interface ExtendedUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  profile_completed?: boolean;
  [key: string]: any;
}

export default function CustomerProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const extendedUser = user as ExtendedUser;

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
      });
      loadAccessRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadAccessRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccessRequests(data as AccessRequest[]);
    } catch (error) {
      console.error('Failed to load access requests:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (role: string) => {
    if (!user) return;

    try {
      const existing = accessRequests.find(
        (req) => req.requested_role === role && req.status === 'pending'
      );

      if (existing) {
        toast.info('You already have a pending request for this role');
        return;
      }

      const { error } = await supabase.from('access_requests').insert([
        {
          user_id: user.id,
          requested_role: role,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      toast.success('Access request submitted!');
      loadAccessRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit request');
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'pending') return <Clock className="text-yellow-500" size={20} />;
    if (status === 'approved') return <CheckCircle className="text-green-500" size={20} />;
    if (status === 'rejected') return <XCircle className="text-red-500" size={20} />;
    return null;
  };

  const getStatusColor = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (status === 'approved') return 'bg-green-100 text-green-800';
    if (status === 'rejected') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          {extendedUser && !extendedUser.profile_completed && (
            <button
              onClick={() => router.push('/customer/profile/complete')}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Save size={20} />
              Complete Profile
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Profile Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Profile Information</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white px-4 py-3 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Change Password</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    minLength={6}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full bg-gray-900 text-white px-4 py-3 rounded-lg hover:bg-gray-800 font-medium disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

        {/* ✅ COMMENTED OUT - Request Panel Access Section Hidden from Users */}
{/*
<div className="bg-white rounded-lg shadow p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-6">Request Panel Access</h2>
  <p className="text-gray-600 mb-6">
    Want to become a merchant or delivery driver? Request access below.
  </p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <button
      onClick={() => handleRequestAccess('merchant')}
      className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 hover:bg-orange-100 transition-colors text-left"
    >
      <Briefcase className="text-orange-600 mb-3" size={32} />
      <h3 className="font-bold text-gray-900 mb-2">Merchant Panel</h3>
      <p className="text-sm text-gray-600">
        Manage your restaurant and orders
      </p>
    </button>

    <button
      onClick={() => handleRequestAccess('driver')}
      className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition-colors text-left"
    >
      <Bike className="text-blue-600 mb-3" size={32} />
      <h3 className="font-bold text-gray-900 mb-2">Driver Panel</h3>
      <p className="text-sm text-gray-600">
        Deliver orders and earn money
      </p>
    </button>
  </div>

  {accessRequests.length > 0 && (
    <div>
      <h3 className="font-bold text-gray-900 mb-4">Your Requests</h3>
      <div className="space-y-3">
        {accessRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(request.status)}
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {request.requested_role} Panel
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(request.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(request.status)}`}>
              {request.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
*/}

</div>
</div>
    </DashboardLayout>
  );
}
