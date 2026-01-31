/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Mail, Phone, Save, User, Ruler } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

export default function AdminProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const [radiusKm, setRadiusKm] = useState<number>(25);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
  });

  const canSubmit = useMemo(() => {
    return !!formData.full_name.trim() && !!formData.phone.trim() && Number.isFinite(radiusKm) && radiusKm >= 1 && radiusKm <= 200;
  }, [formData.full_name, formData.phone, radiusKm]);

  useEffect(() => {
    if (!user) return;

    setFormData({
      full_name: user.full_name || user.user_metadata?.full_name || '',
      phone: user.phone || '',
      email: user.email || '',
    });
  }, [user]);

  useEffect(() => {
    // Load radius from app_settings (fallback to 25)
    const loadRadius = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'customer_search_radius_km')
          .single();

        if (error) return; // keep default 25
        const n = Number(data?.value);
        if (Number.isFinite(n) && n > 0) setRadiusKm(n);
      } catch {
        // keep default
      }
    };

    loadRadius();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!canSubmit) {
      toast.error('Please fill all fields correctly.');
      return;
    }

    setLoading(true);
    try {
      // 1) Update admin profile basics
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2) Upsert global radius for customer dashboard
      const { error: radiusError } = await supabase
        .from('app_settings')
        .upsert(
          {
            key: 'customer_search_radius_km',
            value: String(Math.round(radiusKm)),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'key' }
        );

      if (radiusError) throw radiusError;

      toast.success('Profile & radius updated');
      // Avoid full reload (faster): just refresh state/UI
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Admin Profile</h1>
          <p className="text-sm text-gray-600 mt-1">
            Update your profile and the customer search radius.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            {/* Customer radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer search radius (km)
              </label>
              <div className="relative">
                <Ruler className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  step={1}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Default is 25km. Recommended: 5–30km.</p>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full bg-primary text-white px-4 py-3 rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={20} />
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
