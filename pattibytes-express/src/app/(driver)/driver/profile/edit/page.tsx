/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';

export default function DriverProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [vehicleType, setVehicleType] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');

  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data: p, error: e1 } = await supabase
          .from('profiles')
          .select('full_name,phone')
          .eq('id', user.id)
          .single();
        if (e1) throw e1;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: dp, error: e2 } = await supabase
          .from('driver_profiles')
          .select('vehicle_type,vehicle_number,license_number,license_expiry,aadhar_number')
          .eq('user_id', user.id)
          .single();
        // If driver_profiles may not exist yet, you can ignore 406/empty and insert on save.

        setFullName(p?.full_name || '');
        setPhone(p?.phone || '');

        setVehicleType(dp?.vehicle_type || '');
        setVehicleNumber(dp?.vehicle_number || '');
        setLicenseNumber(dp?.license_number || '');
        setLicenseExpiry(dp?.license_expiry || '');
        setAadharNumber(dp?.aadhar_number || '');
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: e1 } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (e1) throw e1;

      // Upsert driver profile by user_id (make sure you have unique constraint on driver_profiles.user_id)
      const { error: e2 } = await supabase
        .from('driver_profiles')
        .upsert(
          {
            user_id: user.id,
            vehicle_type: vehicleType || null,
            vehicle_number: vehicleNumber || null,
            license_number: licenseNumber || null,
            license_expiry: licenseExpiry || null,
            aadhar_number: aadharNumber || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      if (e2) throw e2;

      toast.success('Profile updated');
      router.push('/driver/profile');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h1>

        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-700">Vehicle type</label>
                <input
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                  placeholder="Bike"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Vehicle number</label>
                <input
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">License number</label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">License expiry</label>
                <input
                  type="date"
                  value={licenseExpiry}
                  onChange={(e) => setLicenseExpiry(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700">Aadhar number</label>
              <input
                value={aadharNumber}
                onChange={(e) => setAadharNumber(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
