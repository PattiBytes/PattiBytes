/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Store, Upload, X } from 'lucide-react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import Image from 'next/image';

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'restaurant',
    cuisine_types: [] as string[],
    description: '',
    phone: '',
    email: '',
    logo_url: '',
    banner_url: '',
    address: '',
    latitude: 0,
    longitude: 0,
    min_order_amount: 100,
    delivery_radius: 5,
    avg_delivery_time: 30,
  });

  const cuisineOptions = [
    'North Indian', 'South Indian', 'Chinese', 'Italian', 'Mexican',
    'Continental', 'Fast Food', 'Desserts', 'Beverages', 'Street Food'
  ];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo_url' | 'banner_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'restaurant');
      setFormData({ ...formData, [field]: url });
      toast.success('Image uploaded');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const toggleCuisine = (cuisine: string) => {
    setFormData(prev => ({
      ...prev,
      cuisine_types: prev.cuisine_types.includes(cuisine)
        ? prev.cuisine_types.filter(c => c !== cuisine)
        : [...prev.cuisine_types, cuisine]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.cuisine_types.length === 0) {
      toast.error('Please select at least one cuisine type');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .insert([{
          user_id: user!.id,
          ...formData,
          is_active: true,
          is_verified: false,
        }]);

      if (error) throw error;

      toast.success('Restaurant profile created!');
      router.push('/merchant/dashboard');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <Store className="mx-auto text-primary mb-4" size={64} />
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Restaurant Profile</h1>
            <p className="text-gray-600 mt-2">Fill in the details to start receiving orders</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Name *
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Type *
              </label>
              <select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="cloud_kitchen">Cloud Kitchen</option>
                <option value="food_truck">Food Truck</option>
              </select>
            </div>

            {/* Cuisine Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuisine Types * (Select multiple)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {cuisineOptions.map(cuisine => (
                  <button
                    key={cuisine}
                    type="button"
                    onClick={() => toggleCuisine(cuisine)}
                    className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                      formData.cuisine_types.includes(cuisine)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                    }`}
                  >
                    {cuisine}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                placeholder="Tell customers about your restaurant..."
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restaurant Logo
              </label>
              {formData.logo_url && (
                <div className="relative w-32 h-32 mb-4">
                  <Image src={formData.logo_url} alt="Logo" fill className="object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, logo_url: '' })}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <label className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary">
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-600">
                    {uploading ? 'Uploading...' : 'Click to upload logo'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'logo_url')}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address *
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary resize-none"
                required
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Radius (km)
                </label>
                <input
                  type="number"
                  value={formData.delivery_radius}
                  onChange={(e) => setFormData({ ...formData, delivery_radius: Number(e.target.value) })}
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avg Delivery (min)
                </label>
                <input
                  type="number"
                  value={formData.avg_delivery_time}
                  onChange={(e) => setFormData({ ...formData, avg_delivery_time: Number(e.target.value) })}
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-primary text-white py-4 rounded-lg hover:bg-orange-600 font-bold text-lg disabled:opacity-50"
            >
              {loading ? 'Creating Profile...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
