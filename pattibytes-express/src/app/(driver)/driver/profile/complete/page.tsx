/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Truck, Save, FileText } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';

type DriverProfileRow = {
  user_id: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  license_number: string | null;
  license_expiry: string | null;
  profile_photo: string | null;
  vehicle_photo: string | null;
  license_photo: string | null;
  profile_completed: boolean | null;
  updated_at: string | null;
};

export default function DriverCompleteProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [formData, setFormData] = useState({
    vehicle_type: 'bike',
    vehicle_number: '',
    license_number: '',
    license_expiry: '',
    // UI-only for now (NOT stored in driver_profiles until you add DB columns)
    aadhar_number: '',
    profile_photo: '',
    vehicle_photo: '',
    license_photo: '',
    aadhar_photo: '',
  });

  const canSubmit = useMemo(() => {
    if (!formData.profile_photo) return false;
    if (!formData.vehicle_number) return false;
    if (!formData.license_number) return false;
    if (!formData.license_expiry) return false;
    if (!formData.vehicle_photo) return false;
    if (!formData.license_photo) return false;
    return true;
  }, [formData]);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user) return;

    setLoadingProfile(true);
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      const row = data as DriverProfileRow | null;
      if (row) {
        setFormData((p) => ({
          ...p,
          vehicle_type: row.vehicle_type || 'bike',
          vehicle_number: row.vehicle_number || '',
          license_number: row.license_number || '',
          license_expiry: row.license_expiry || '',
          profile_photo: row.profile_photo || '',
          vehicle_photo: row.vehicle_photo || '',
          license_photo: row.license_photo || '',
        }));
      }
    } catch (e: any) {
      console.error('Failed to load driver profile:', {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
        raw: e,
      });
      toast.error(e?.message || 'Failed to load profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login again');
      return;
    }

    if (!canSubmit) {
      toast.error('Please fill all required fields and upload required images');
      return;
    }

    setLoading(true);
    try {
      // Check existence (avoids upsert complexities) [web:44][web:45]
      const { data: existing, error: exErr } = await supabase
        .from('driver_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (exErr) throw exErr;

      // IMPORTANT: do NOT send aadhar_* until DB columns exist
      const payload = {
        user_id: user.id,
        vehicle_type: formData.vehicle_type,
        vehicle_number: formData.vehicle_number,
        license_number: formData.license_number,
        license_expiry: formData.license_expiry,
        profile_photo: formData.profile_photo,
        vehicle_photo: formData.vehicle_photo,
        license_photo: formData.license_photo,
        profile_completed: true,
        updated_at: new Date().toISOString(),
      };

      const q = existing
        ? supabase.from('driver_profiles').update(payload).eq('user_id', user.id)
        : supabase.from('driver_profiles').insert(payload);

      const { error: driverError } = await q.select('user_id').single();
      if (driverError) throw driverError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: formData.profile_photo,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Driver profile completed successfully!');
      router.push('/driver/dashboard');
    } catch (err: any) {
      console.error('Failed to update profile:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });
      toast.error(err?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-6 px-3 sm:py-12 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Complete Driver Profile
            </h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">
              Provide your details to start delivering
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo *
              </label>
              <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto">
                <ImageUpload
                  type="profile"
                  folder={`drivers/${user?.id}/profile`}
                  currentImage={formData.profile_photo}
                  onUpload={(url) => setFormData((p) => ({ ...p, profile_photo: url }))}
                  className="w-full h-full"
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck size={22} className="text-primary" />
                Vehicle Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData((p) => ({ ...p, vehicle_type: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="bike">Bike/Scooter</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, vehicle_number: e.target.value.toUpperCase() }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="PB03AA1234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Photo *
                  </label>
                  <div className="w-full h-44 sm:h-48">
                    <ImageUpload
                      type="document"
                      folder={`drivers/${user?.id}/documents`}
                      currentImage={formData.vehicle_photo}
                      onUpload={(url) => setFormData((p) => ({ ...p, vehicle_photo: url }))}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={22} className="text-primary" />
                License Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Driving License Number *
                  </label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, license_number: e.target.value.toUpperCase() }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="PB0320210012345"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => setFormData((p) => ({ ...p, license_expiry: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Photo *
                  </label>
                  <div className="w-full h-44 sm:h-48">
                    <ImageUpload
                      type="document"
                      folder={`drivers/${user?.id}/documents`}
                      currentImage={formData.license_photo}
                      onUpload={(url) => setFormData((p) => ({ ...p, license_photo: url }))}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* UI-only Aadhaar (kept, but not saved to driver_profiles) */}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Identity Verification</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhar Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.aadhar_number}
                    onChange={(e) => setFormData((p) => ({ ...p, aadhar_number: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="1234 5678 9012"
                    maxLength={14}
                  />
                </div>

                {!!formData.aadhar_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Photo (Optional)
                    </label>
                    <div className="w-full h-44 sm:h-48">
                      <ImageUpload
                        type="document"
                        folder={`drivers/${user?.id}/documents`}
                        currentImage={formData.aadhar_photo}
                        onUpload={(url) => setFormData((p) => ({ ...p, aadhar_photo: url }))}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full btn-primary py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save size={22} />
              {loading ? 'Saving Profile...' : 'Complete Driver Setup'}
            </button>

            <p className="text-center text-sm text-gray-600">
              Your profile will be reviewed by admin before you can start delivering
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
