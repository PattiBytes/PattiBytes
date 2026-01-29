/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { User, MapPin, Save } from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';

export default function CompleteProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    avatar_url: '',
    addresses: [] as any[],
  });
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    address: '',
    city: 'Ludhiana',
    state: 'Punjab',
    pincode: '',
    landmark: '',
    is_default: true,
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
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          full_name: data.full_name || '',
          phone: data.phone || '',
          avatar_url: data.avatar_url || '',
          addresses: data.addresses || [],
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.address || !newAddress.pincode) {
      toast.error('Please fill address and pincode');
      return;
    }

    setFormData({
      ...formData,
      addresses: [...formData.addresses, { ...newAddress, id: Date.now() }],
    });

    setNewAddress({
      label: 'Home',
      address: '',
      city: 'Ludhiana',
      state: 'Punjab',
      pincode: '',
      landmark: '',
      is_default: false,
    });

    toast.success('Address added');
  };

  const handleRemoveAddress = (id: number) => {
    setFormData({
      ...formData,
      addresses: formData.addresses.filter((addr) => addr.id !== id),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          addresses: formData.addresses,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Profile completed successfully!');
      router.push('/customer/dashboard');
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
              <User className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
            <p className="text-gray-600 mt-2">Help us serve you better</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture (Optional)
              </label>
              <div className="w-32 h-32 mx-auto">
                <ImageUpload
                  type="profile"
                  currentImage={formData.avatar_url}
                  onUpload={(url) => setFormData({ ...formData, avatar_url: url })}
                />
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Addresses */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={24} className="text-primary" />
                Delivery Addresses
              </h3>

              {formData.addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {formData.addresses.map((addr) => (
                    <div key={addr.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-primary text-white text-sm rounded-full font-medium">
                              {addr.label}
                            </span>
                            {addr.is_default && (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900">{addr.address}</p>
                          <p className="text-sm text-gray-600">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                          {addr.landmark && (
                            <p className="text-sm text-gray-600">Near: {addr.landmark}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveAddress(addr.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Label
                    </label>
                    <select
                      value={newAddress.label}
                      onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="Home">🏠 Home</option>
                      <option value="Work">💼 Work</option>
                      <option value="Other">📍 Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="141001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complete Address
                  </label>
                  <textarea
                    value={newAddress.address}
                    onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={2}
                    placeholder="House No, Street, Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Landmark (Optional)
                  </label>
                  <input
                    type="text"
                    value={newAddress.landmark}
                    onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Near Clock Tower"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium"
                >
                  + Add Address
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !formData.full_name || !formData.phone}
              className="w-full btn-primary py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Complete Profile
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600">
              You can skip this for now, but you&apos;ll need to complete it before placing orders
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
