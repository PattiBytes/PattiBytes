/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Save, Store, Clock, Percent } from 'lucide-react';
import { toast } from 'react-toastify';
import ImageUpload from '@/components/common/ImageUpload';
import LocationPicker from '@/components/common/LocationPicker';
import { LocationData } from '@/services/location';

// ✅ ADD THESE HELPER FUNCTIONS
function formatTimeDisplay(time: string): string {
  if (!time) return '';
  try {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  } catch {
    return time;
  }
}

function isOvernightShift(openingTime: string, closingTime: string): boolean {
  if (!openingTime || !closingTime) return false;
  try {
    const [openHour] = openingTime.split(':').map(Number);
    const [closeHour] = closingTime.split(':').map(Number);
    return closeHour < openHour;
  } catch {
    return false;
  }
}

export default function MerchantProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [merchantId, setMerchantId] = useState<string>('');
  const [location, setLocation] = useState<LocationData | null>(null);

 const [formData, setFormData] = useState({
  business_name: '',
  business_type: 'Restaurant',
  logo_url: '',
  banner_url: '',
  description: '',
  cuisine_types: [] as string[],
  phone: '',
  email: '',
  min_order_amount: 100,
  delivery_radius_km: 5,
  estimated_prep_time: 30,
  is_active: true,
  gst_enabled: false,
  gst_percentage: 5,
  
  // ✅ ADD THESE TWO LINES
  opening_time: '',
  closing_time: '',
});


  const cuisineOptions = [
    'Punjabi', 'North Indian', 'South Indian', 'Chinese',
    'Fast Food', 'Street Food', 'Desserts', 'Beverages',
    'Continental', 'Italian', 'Mexican',
  ];

  const businessTypes = ['Restaurant', 'Cloud Kitchen', 'Cafe', 'Bakery', 'Sweet Shop', 'Dhaba'];
const [pwd, setPwd] = useState({
  current: '',
  next: '',
  confirm: '',
});
const [changingPwd, setChangingPwd] = useState(false);

const handleChangePassword = async () => {
  try {
    if (!user?.email) return toast.error('Missing user email');
    if (!pwd.current || !pwd.next || !pwd.confirm) return toast.error('Fill all password fields');
    if (pwd.next.length < 6) return toast.error('New password must be at least 6 characters');
    if (pwd.next !== pwd.confirm) return toast.error('New password and confirm password do not match');
    if (pwd.current === pwd.next) return toast.error('New password must be different');

    setChangingPwd(true);

    // Optional but recommended: verify current password first
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwd.current,
    });
    if (reauthErr) throw new Error('Current password is incorrect');

    const { error } = await supabase.auth.updateUser({ password: pwd.next });
    if (error) throw error;

    toast.success('Password changed successfully');
    setPwd({ current: '', next: '', confirm: '' });
  } catch (e: any) {
    console.error(e);
    toast.error(e?.message || 'Failed to change password');
  } finally {
    setChangingPwd(false);
  }
};

  useEffect(() => {
    if (user) loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
  setMerchantId(data.id);

  setFormData({
    business_name: data.business_name || '',
    business_type: data.business_type || 'Restaurant',
    logo_url: data.logo_url || '',
    banner_url: data.banner_url || '',
    description: data.description || '',
    cuisine_types: data.cuisine_types || [],
    phone: data.phone || '',
    email: data.email || '',
    min_order_amount: data.min_order_amount || 100,
    delivery_radius_km: data.delivery_radius_km || 5,
    estimated_prep_time: data.estimated_prep_time || 30,
    is_active: data.is_active ?? true,
    gst_enabled: data.gst_enabled ?? false,
    gst_percentage: Number(data.gst_percentage ?? 5),
    
    // ✅ ADD THESE TWO LINES
    opening_time: data.opening_time || '',
    closing_time: data.closing_time || '',
  });

        if (data.address && data.latitude && data.longitude) {
          setLocation({
            address: data.address,
            lat: data.latitude,
            lon: data.longitude,
            city: data.city || undefined,
            state: data.state || undefined,
            postalcode: data.postal_code || undefined,
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Error loading profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    setFormData((prev) => ({
      ...prev,
      cuisine_types: prev.cuisine_types.includes(cuisine)
        ? prev.cuisine_types.filter((c) => c !== cuisine)
        : [...prev.cuisine_types, cuisine],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!merchantId) return toast.error('No merchant profile found');

      if (!formData.business_name || !formData.phone || formData.cuisine_types.length === 0) {
        return toast.error('Please fill all required fields');
      }

      if (!location?.address || !location.lat || !location.lon) {
        return toast.error('Please select a business location');
      }

      if (formData.gst_enabled) {
        const pct = Number(formData.gst_percentage);
        if (!Number.isFinite(pct) || pct < 0 || pct > 28) {
          return toast.error('GST % must be between 0 and 28');
        }
      }

      const { error } = await supabase
  .from('merchants')
  .update({
    business_name: formData.business_name,
    business_type: formData.business_type,
    logo_url: formData.logo_url,
    banner_url: formData.banner_url,
    description: formData.description,
    cuisine_types: formData.cuisine_types,
    phone: formData.phone,
    email: formData.email,

    address: location.address,
    latitude: location.lat,
    longitude: location.lon,
    city: location.city || null,
    state: location.state || null,
    postal_code: location.postalcode || null,

    min_order_amount: formData.min_order_amount,
    delivery_radius_km: formData.delivery_radius_km,
    estimated_prep_time: formData.estimated_prep_time,
    is_active: formData.is_active,

    gst_enabled: formData.gst_enabled,
    gst_percentage: Number(formData.gst_percentage || 0),

    // ✅ ADD THESE TWO LINES
    opening_time: formData.opening_time || null,
    closing_time: formData.closing_time || null,

    updated_at: new Date().toISOString(),
  })
  .eq('id', merchantId);


      if (error) throw error;

      toast.success('Profile updated successfully!');
      loadProfile();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!merchantId) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Store className="mx-auto text-primary mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">No Merchant Profile</h1>
            <p className="text-gray-600 mb-8">Please contact an administrator to set up your merchant account.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Restaurant Profile</h1>
          <p className="text-gray-600 mt-1">Manage your restaurant information</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-8">
            {/* Images */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Restaurant Branding</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="w-40 h-40">
                    <ImageUpload
                      type="profile"
                      currentImage={formData.logo_url}
                      onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Banner</label>
                  <div className="w-full h-40">
                    <ImageUpload
                      type="banner"
                      currentImage={formData.banner_url}
                      onUpload={(url) => setFormData({ ...formData, banner_url: url })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Restaurant Name *</label>
                  <input
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {businessTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Cuisine Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Cuisine Types *</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cuisineOptions.map((cuisine) => (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => toggleCuisine(cuisine)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      formData.cuisine_types.includes(cuisine)
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Location */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Business Location *</h3>
              <LocationPicker value={location} onChange={setLocation} />
            </div>

            {/* Delivery Settings */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={20} className="text-primary" />
                Delivery Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Order (₹)</label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Radius (km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.delivery_radius_km}
                    onChange={(e) => setFormData({ ...formData, delivery_radius_km: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    min={1}
                    max={50}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prep Time (min)</label>
                  <input
                    type="number"
                    value={formData.estimated_prep_time}
                    onChange={(e) => setFormData({ ...formData, estimated_prep_time: Number(e.target.value) })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    min={10}
                    max={120}
                  />
                </div>
              </div>
            </div>
            {/* ✅ Operating Hours Section - ADD THIS */}
<div>
  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
    <Clock size={20} className="text-primary" />
    Operating Hours
  </h3>

  <div className="rounded-lg border border-gray-200 p-4 space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <p className="text-sm text-blue-800">
        <strong>💡 Tip:</strong> Leave both fields empty if your restaurant is open 24/7 or doesn&apos;t have fixed hours.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Opening Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Opening Time
        </label>
        <input
          type="time"
          value={formData.opening_time}
          onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-gray-500 mt-1">
          When your restaurant starts accepting orders
        </p>
      </div>

      {/* Closing Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Closing Time
        </label>
        <input
          type="time"
          value={formData.closing_time}
          onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-gray-500 mt-1">
          When your restaurant stops accepting orders
        </p>
      </div>
    </div>

    {/* Preview Current Status */}
    {formData.opening_time && formData.closing_time && (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-sm font-semibold text-gray-900 mb-2">
          📅 Operating Schedule Preview:
        </p>
        <div className="text-sm text-gray-700 space-y-1">
          <p>
            • <strong>Opens:</strong> {formatTimeDisplay(formData.opening_time)}
          </p>
          <p>
            • <strong>Closes:</strong> {formatTimeDisplay(formData.closing_time)}
          </p>
          {isOvernightShift(formData.opening_time, formData.closing_time) && (
            <p className="text-orange-600 font-semibold mt-2">
              ⚠️ Overnight shift detected (closes next day)
            </p>
          )}
        </div>
      </div>
    )}

    {!formData.opening_time && !formData.closing_time && (
      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
        <p className="text-sm text-green-800">
          ✅ <strong>Always Open:</strong> Your restaurant will appear as open 24/7 to customers.
        </p>
      </div>
    )}
  </div>
</div>


            {/* GST Settings (NEW) */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Percent size={20} className="text-primary" />
                GST Settings
              </h3>

              <div className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="gst_enabled"
                    checked={formData.gst_enabled}
                    onChange={(e) => setFormData({ ...formData, gst_enabled: e.target.checked })}
                    className="w-5 h-5 text-primary rounded"
                  />
                  <label htmlFor="gst_enabled" className="font-medium text-gray-900">
                    This restaurant charges GST
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">GST %</label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={28}
                      value={formData.gst_percentage}
                      disabled={!formData.gst_enabled}
                      onChange={(e) => setFormData({ ...formData, gst_percentage: Number(e.target.value) })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">If disabled, checkout GST becomes 0 for this merchant.</p>
                  </div>
                </div>
              </div>
            </div>
<div>
  <h3 className="text-lg font-bold text-gray-900 mb-4">Security</h3>

  <div className="rounded-lg border border-gray-200 p-4 space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current password</label>
        <input
          type="password"
          value={pwd.current}
          onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          autoComplete="current-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">New password</label>
        <input
          type="password"
          value={pwd.next}
          onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm new password</label>
        <input
          type="password"
          value={pwd.confirm}
          onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          autoComplete="new-password"
        />
      </div>
    </div>

    <button
      type="button"
      onClick={handleChangePassword}
      disabled={changingPwd}
      className="bg-gray-900 text-white px-5 py-2.5 rounded-lg hover:bg-black font-semibold disabled:opacity-50"
    >
      {changingPwd ? 'Changing...' : 'Change password'}
    </button>

    <p className="text-xs text-gray-500">
      Tip: After changing password, keep it private and avoid reusing old passwords.
    </p>
  </div>
</div>

            {/* Active */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-5 h-5 text-primary rounded"
              />
              <label htmlFor="is_active" className="font-medium text-gray-900">
                Restaurant is currently accepting orders
              </label>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
