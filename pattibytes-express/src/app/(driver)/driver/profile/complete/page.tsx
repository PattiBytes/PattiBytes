'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Truck, Save, FileText } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';

export default function DriverCompleteProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_type: 'bike',
    vehicle_number: '',
    license_number: '',
    license_expiry: '',
    aadhar_number: '',
    profile_photo: '',
    vehicle_photo: '',
    license_photo: '',
    aadhar_photo: '',
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          vehicle_type: data.vehicle_type || 'bike',
          vehicle_number: data.vehicle_number || '',
          license_number: data.license_number || '',
          license_expiry: data.license_expiry || '',
          aadhar_number: data.aadhar_number || '',
          profile_photo: data.profile_photo || '',
          vehicle_photo: data.vehicle_photo || '',
          license_photo: data.license_photo || '',
          aadhar_photo: data.aadhar_photo || '',
        });
      }
    } catch (error) {
      console.error('Failed to load driver profile:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicle_number || !formData.license_number) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      // Create/update driver profile
      const { error: driverError } = await supabase
        .from('driver_profiles')
        .upsert([
          {
            user_id: user?.id,
            ...formData,
            profile_completed: true,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (driverError) throw driverError;

      // Update main profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          avatar_url: formData.profile_photo,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      toast.success('Driver profile completed successfully!');
      router.push('/driver/dashboard');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Complete Driver Profile</h1>
            <p className="text-gray-600 mt-2">Provide your details to start delivering</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Photo *
              </label>
              <div className="w-32 h-32 mx-auto">
                <ImageUpload
                  type="profile"
                  currentImage={formData.profile_photo}
                  onUpload={(url) => setFormData({ ...formData, profile_photo: url })}
                />
              </div>
            </div>

            {/* Vehicle Info */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck size={24} className="text-primary" />
                Vehicle Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Type *
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="bike">🏍️ Bike/Scooter</option>
                    <option value="car">🚗 Car</option>
                    <option value="van">🚐 Van</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="PB03AA1234"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Photo *
                  </label>
                  <div className="w-full h-48">
                    <ImageUpload
                      type="document"
                      currentImage={formData.vehicle_photo}
                      onUpload={(url) => setFormData({ ...formData, vehicle_photo: url })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* License Info */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={24} className="text-primary" />
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
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value.toUpperCase() })}
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
                    onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Photo *
                  </label>
                  <div className="w-full h-48">
                    <ImageUpload
                      type="document"
                      currentImage={formData.license_photo}
                      onUpload={(url) => setFormData({ ...formData, license_photo: url })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Aadhar Info */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Identity Verification</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Aadhar Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.aadhar_number}
                    onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="1234 5678 9012"
                    maxLength={14}
                  />
                </div>

                {formData.aadhar_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Aadhar Photo (Optional)
                    </label>
                    <div className="w-full h-48">
                      <ImageUpload
                        type="document"
                        currentImage={formData.aadhar_photo}
                        onUpload={(url) => setFormData({ ...formData, aadhar_photo: url })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-4 rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Saving Profile...
                </>
              ) : (
                <>
                  <Save size={24} />
                  Complete Driver Setup
                </>
              )}
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
