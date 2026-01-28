/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { User, Mail, Phone, Lock, MapPin, Briefcase, Bike, Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
}

export default function CustomerProfilePage() {
 const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name,
        phone: user.phone || '',
        email: user.email,
      });
      loadAccessRequests();
    }
  }, [user]);

  const loadAccessRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .select('*')
        .eq('user_id', user!.id)
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
      })
      .eq('id', user!.id);

    if (error) throw error;

    toast.success('Profile updated successfully');
    
    // Reload the page to get updated profile
    window.location.reload();
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
    try {
      // Check if already requested
      const existing = accessRequests.find(
        (req) => req.requested_role === role && req.status === 'pending'
      );

      if (existing) {
        toast.info('You already have a pending request for this role');
        return;
      }

      const { error } = await supabase.from('access_requests').insert([
        {
          user_id: user!.id,
          requested_role: role,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      toast.success('Access request submitted! Admins will review it soon.');
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        <div className="space-y-6">
          {/* Profile Information */}
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
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-50"
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
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Min. 6 characters"
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
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Confirm password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 font-semibold disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Request Panel Access */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Panel Access</h2>
            <p className="text-gray-600 mb-6">
              Want to become a merchant or delivery driver? Request access below.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleRequestAccess('merchant')}
                className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-orange-50 transition-all"
              >
                <Briefcase className="text-primary" size={32} />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Merchant Panel</p>
                  <p className="text-sm text-gray-600">Manage your restaurant</p>
                </div>
              </button>

              <button
                onClick={() => handleRequestAccess('driver')}
                className="flex items-center gap-3 p-4 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-orange-50 transition-all"
              >
                <Bike className="text-primary" size={32} />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Driver Panel</p>
                  <p className="text-sm text-gray-600">Deliver orders</p>
                </div>
              </button>
            </div>

            {/* Access Requests Status */}
            {accessRequests.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Your Requests</h3>
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
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Saved Addresses Link */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="text-primary" size={32} />
                <div>
                  <p className="font-semibold text-gray-900">Saved Addresses</p>
                  <p className="text-sm text-gray-600">Manage your delivery addresses</p>
                </div>
              </div>
              <a
                href="/customer/addresses"
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium"
              >
                Manage
              </a>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
