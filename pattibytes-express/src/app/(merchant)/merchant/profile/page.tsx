/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Save, Store, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import ImageUpload from '@/components/common/ImageUpload';
import LocationPicker from '@/components/common/LocationPicker';
import { LocationData } from '@/services/location';

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
  });

  const cuisineOptions = [
    'Punjabi', 'North Indian', 'South Indian', 'Chinese',
    'Fast Food', 'Street Food', 'Desserts', 'Beverages',
    'Continental', 'Italian', 'Mexican',
  ];

  const businessTypes = ['Restaurant', 'Cloud Kitchen', 'Cafe', 'Bakery', 'Sweet Shop', 'Dhaba'];

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
