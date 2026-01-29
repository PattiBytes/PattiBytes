'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Store, MapPin, Clock, Save } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';

export default function MerchantCompleteProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    restaurant_name: '',
    restaurant_logo: '',
    restaurant_banner: '',
    description: '',
    cuisine_types: [] as string[],
    address: '',
    city: 'Ludhiana',
    state: 'Punjab',
    pincode: '',
    latitude: '',
    longitude: '',
    phone: '',
    alternate_phone: '',
    opening_time: '09:00',
    closing_time: '22:00',
    min_order_amount: 100,
    delivery_radius_km: 10,
    avg_delivery_time: 30,
    fssai_license: '',
    gst_number: '',
  });

  const cuisineOptions = [
    'Punjabi',
    'North Indian',
    'South Indian',
    'Chinese',
    'Fast Food',
    'Street Food',
    'Desserts',
    'Beverages',
    'Continental',
    'Italian',
    'Mexican',
  ];

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
        .from('merchant_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setFormData({
          restaurant_name: data.restaurant_name || '',
          restaurant_logo: data.restaurant_logo || '',
          restaurant_banner: data.restaurant_banner || '',
          description: data.description || '',
          cuisine_types: data.cuisine_types || [],
          address: data.address || '',
          city: data.city || 'Ludhiana',
          state: data.state || 'Punjab',
          pincode: data.pincode || '',
          latitude: data.latitude || '',
          longitude: data.longitude || '',
          phone: data.phone || user.phone || '',
          alternate_phone: data.alternate_phone || '',
          opening_time: data.opening_time || '09:00',
          closing_time: data.closing_time || '22:00',
          min_order_amount: data.min_order_amount || 100,
          delivery_radius_km: data.delivery_radius_km || 10,
          avg_delivery_time: data.avg_delivery_time || 30,
          fssai_license: data.fssai_license || '',
          gst_number: data.gst_number || '',
        });
      }
    } catch (error) {
      console.error('Failed to load merchant profile:', error);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    if (formData.cuisine_types.includes(cuisine)) {
      setFormData({
        ...formData,
        cuisine_types: formData.cuisine_types.filter((c) => c !== cuisine),
      });
    } else {
      setFormData({
        ...formData,
        cuisine_types: [...formData.cuisine_types, cuisine],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.restaurant_name || !formData.address || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);

    try {
      // First, create/update merchant profile
      const { error: merchantError } = await supabase
        .from('merchant_profiles')
        .upsert([
          {
            user_id: user?.id,
            ...formData,
            profile_completed: true,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (merchantError) throw merchantError;

      // Then update main profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.restaurant_name,
          phone: formData.phone,
          avatar_url: formData.restaurant_logo,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      toast.success('Restaurant profile completed successfully!');
      router.push('/merchant/dashboard');
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Store className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Setup Your Restaurant</h1>
            <p className="text-gray-600 mt-2">Complete your restaurant profile to start receiving orders</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Restaurant Images */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Restaurant Branding</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Logo *
                  </label>
                  <div className="w-40 h-40">
                    <ImageUpload
                      type="profile"
                      currentImage={formData.restaurant_logo}
                      onUpload={(url) => setFormData({ ...formData, restaurant_logo: url })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Image
                  </label>
                  <div className="w-full h-40">
                    <ImageUpload
                      type="banner"
                      currentImage={formData.restaurant_banner}
                      onUpload={(url) => setFormData({ ...formData, restaurant_banner: url })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.restaurant_name}
                    onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g., Punjabi Dhaba"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={3}
                    placeholder="Tell customers about your restaurant..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="+91 9876543210"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alternate Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.alternate_phone}
                    onChange={(e) => setFormData({ ...formData, alternate_phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>
            </div>

            {/* Cuisine Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cuisine Types *
              </label>
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

            {/* Location */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={24} className="text-primary" />
                Location Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Complete Address *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    placeholder="Shop No, Street, Area"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="30.9010"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="75.8573"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={24} className="text-primary" />
                Operating Hours & Delivery
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.min_order_amount}
                    onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Radius (KM)
                  </label>
                  <input
                    type="number"
                    value={formData.delivery_radius_km}
                    onChange={(e) => setFormData({ ...formData, delivery_radius_km: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Delivery Time (Minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.avg_delivery_time}
                    onChange={(e) => setFormData({ ...formData, avg_delivery_time: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Legal Info */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Legal Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    FSSAI License Number
                  </label>
                  <input
                    type="text"
                    value={formData.fssai_license}
                    onChange={(e) => setFormData({ ...formData, fssai_license: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="12345678901234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="22AAAAA0000A1Z5"
                  />
                </div>
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
                  Complete Restaurant Setup
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
