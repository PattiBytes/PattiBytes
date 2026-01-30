/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { MapPin, Plus, Trash2, Star, Home, Briefcase } from 'lucide-react';
import { toast } from 'react-toastify';

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  postal_code?: string;
  is_default: boolean;
}

export default function CustomerAddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    label: 'Home',
    address: '',
    latitude: 0,
    longitude: 0,
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;

    try {
      // ✅ FIX: Use customer_id instead of user_id
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false });

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message.includes('does not exist')) {
          console.log('Saved addresses table not ready yet');
          setAddresses([]);
          return;
        }
        throw error;
      }

      setAddresses(data || []);
    } catch (error: any) {
      console.error('Failed to load addresses:', error.message);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (addressData: any) => {
    setFormData({
      ...formData,
      address: addressData.address,
      latitude: addressData.lat,
      longitude: addressData.lon,
      city: addressData.city || '',
      state: addressData.state || '',
      postal_code: addressData.postal_code || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      // If this is set as default, unset all other defaults
      if (formData.is_default) {
        await supabase
          .from('saved_addresses')
          .update({ is_default: false })
          .eq('customer_id', user.id);
      }

      // ✅ FIX: Use customer_id instead of user_id
      const { error } = await supabase
        .from('saved_addresses')
        .insert([{
          ...formData,
          customer_id: user.id,
        }]);

      if (error) throw error;

      toast.success('Address saved successfully! 🎉');
      setShowModal(false);
      resetForm();
      loadAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save address');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;

    try {
      const { error } = await supabase
        .from('saved_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Address deleted');
      loadAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // Unset all defaults
      await supabase
        .from('saved_addresses')
        .update({ is_default: false })
        .eq('customer_id', user?.id);

      // Set new default
      const { error } = await supabase
        .from('saved_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Default address updated');
      loadAddresses();
    } catch (error) {
      toast.error('Failed to update default address');
    }
  };

  const resetForm = () => {
    setFormData({
      label: 'Home',
      address: '',
      latitude: 0,
      longitude: 0,
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
    });
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return <Home size={20} />;
      case 'work':
        return <Briefcase size={20} />;
      default:
        return <MapPin size={20} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Saved Addresses</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your delivery addresses</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            <Plus size={20} />
            Add Address
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-48 rounded-lg sm:rounded-xl animate-pulse" />
            ))}
          </div>
        ) : addresses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-4 sm:p-6 ${
                  address.is_default ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-white">
                      {getLabelIcon(address.label)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">{address.label}</h3>
                      {address.is_default && (
                        <span className="text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold mt-1 inline-block">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{address.address}</p>

                <div className="flex gap-2">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 text-xs sm:text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Star size={14} />
                      <span className="hidden sm:inline">Set</span> Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 text-xs sm:text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 sm:py-16 bg-white rounded-xl shadow-lg">
            <MapPin size={60} className="mx-auto text-gray-400 mb-4 sm:hidden" />
            <MapPin size={80} className="mx-auto text-gray-400 mb-4 hidden sm:block" />
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No saved addresses</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">Add your first delivery address to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-3 rounded-lg hover:from-orange-600 hover:to-pink-600 font-medium shadow-lg hover:shadow-xl transition-all"
            >
              Add Address Now
            </button>
          </div>
        )}

        {/* Add Address Modal - Responsive */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10">
                <h2 className="text-xl sm:text-2xl font-bold">Add New Address</h2>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Label *
                  </label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="Home">🏠 Home</option>
                    <option value="Work">💼 Work</option>
                    <option value="Other">📍 Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Address *
                  </label>
                  <AddressAutocomplete
                    onSelect={handleAddressSelect}
                    placeholder="Search for your address..."
                  />
                </div>

                {formData.address && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3 sm:p-4">
                    <p className="text-sm font-medium text-green-900 mb-1">✓ Selected Address:</p>
                    <p className="text-xs sm:text-sm text-green-800">{formData.address}</p>
                  </div>
                )}

                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-5 h-5 text-primary rounded"
                  />
                  <span className="font-medium text-sm sm:text-base">Set as default delivery address</span>
                </label>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.address}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-pink-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
