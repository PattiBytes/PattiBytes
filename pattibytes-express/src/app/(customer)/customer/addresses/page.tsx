/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { locationService, SavedAddress } from '@/services/location';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import LocationPicker from '@/components/LocationPicker';
import { Plus, MapPin, Home, Briefcase, Edit, Trash2, Check } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CustomerAddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [formData, setFormData] = useState({
    label: 'Home',
    address: '',
    latitude: 30.9010,
    longitude: 75.8573,
    city: '',
    state: 'Punjab',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;
    
    try {
      const data = await locationService.getSavedAddresses(user.id);
      setAddresses(data);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingAddress) {
        await locationService.updateAddress(editingAddress.id, formData);
        toast.success('Address updated!');
      } else {
        await locationService.saveAddress({
          ...formData,
          user_id: user.id,
        });
        toast.success('Address saved!');
      }

      setShowModal(false);
      setEditingAddress(null);
      resetForm();
      loadAddresses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save address');
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      await locationService.deleteAddress(addressId);
      toast.success('Address deleted!');
      loadAddresses();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await locationService.updateAddress(addressId, { is_default: true });
      toast.success('Default address updated!');
      loadAddresses();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to update default address');
    }
  };

  const resetForm = () => {
    setFormData({
      label: 'Home',
      address: '',
      latitude: 30.9010,
      longitude: 75.8573,
      city: '',
      state: 'Punjab',
      postal_code: '',
      is_default: false,
    });
  };

  const openEditModal = (address: SavedAddress) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      address: address.address,
      latitude: address.latitude,
      longitude: address.longitude,
      city: address.city || '',
      state: address.state || 'Punjab',
      postal_code: address.postal_code || '',
      is_default: address.is_default,
    });
    setShowModal(true);
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return <Home size={20} className="text-blue-600" />;
      case 'work':
        return <Briefcase size={20} className="text-green-600" />;
      default:
        return <MapPin size={20} className="text-orange-600" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Addresses</h1>
            <p className="text-gray-600 mt-1">Manage your delivery addresses</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingAddress(null);
              setShowModal(true);
            }}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
          >
            <Plus size={20} />
            Add Address
          </button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : addresses.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-lg shadow p-6 ${
                  address.is_default ? 'border-2 border-primary' : 'border border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getLabelIcon(address.label)}
                    <div>
                      <h3 className="font-bold text-gray-900">{address.label}</h3>
                      {address.is_default && (
                        <span className="inline-block px-2 py-1 bg-primary text-white text-xs rounded mt-1">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(address)}
                      className="text-blue-600 hover:bg-blue-50 p-2 rounded"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(address.id)}
                      className="text-red-600 hover:bg-red-50 p-2 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <p className="text-gray-700 mb-3">{address.address}</p>
                {(address.city || address.state || address.postal_code) && (
                  <p className="text-sm text-gray-600 mb-3">
                    {[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}
                  </p>
                )}

                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                  >
                    <Check size={16} />
                    Set as Default
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <MapPin size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No addresses saved</h3>
            <p className="text-gray-600">Add your first delivery address</p>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </label>
                  <div className="flex gap-3">
                    {['Home', 'Work', 'Other'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormData({ ...formData, label })}
                        className={`flex-1 py-3 rounded-lg font-medium ${
                          formData.label === label
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location * (Select on map)
                  </label>
                  <LocationPicker
                    initialLat={formData.latitude}
                    initialLon={formData.longitude}
                    onLocationSelect={(location) => {
                      setFormData({
                        ...formData,
                        latitude: location.lat,
                        longitude: location.lon,
                        address: location.address,
                      });
                    }}
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
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
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
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                      maxLength={6}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-5 h-5 text-primary"
                  />
                  <span className="font-medium">Set as default address</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAddress(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    {editingAddress ? 'Update Address' : 'Save Address'}
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
