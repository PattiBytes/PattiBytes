'use client';

import { useState, useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MapPin, Plus, Check, Edit, Trash2, Loader } from 'lucide-react';
import { locationService, SavedAddress } from '@/services/location';
import { toast } from 'react-toastify';

interface AddressSelectorProps {
  userId: string;
  selectedAddress: SavedAddress | null;
  onAddressSelect: (address: SavedAddress) => void;
}

export default function AddressSelector({ userId, selectedAddress, onAddressSelect }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    address: '',
    latitude: 0,
    longitude: 0,
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    loadAddresses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAddresses = async () => {
    setLoading(true);
    const data = await locationService.getSavedAddresses(userId);
    setAddresses(data);
    
    // Auto-select default address if none selected
    if (!selectedAddress && data.length > 0) {
      const defaultAddr = data.find(a => a.is_default) || data[0];
      onAddressSelect(defaultAddr);
    }
    setLoading(false);
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const address = await locationService.reverseGeocode(coords.lat, coords.lon);
      
      setFormData({
        ...formData,
        latitude: coords.lat,
        longitude: coords.lon,
        address,
      });
      toast.success('Location detected!');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!formData.label || !formData.address || !formData.latitude || !formData.longitude) {
      toast.error('Please fill all required fields');
      return;
    }

    const newAddress = await locationService.saveAddress({
      user_id: userId,
      ...formData,
    });

    if (newAddress) {
      toast.success('Address saved!');
      setShowAddModal(false);
      resetForm();
      loadAddresses();
    } else {
      toast.error('Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Delete this address?')) return;
    
    const success = await locationService.deleteAddress(addressId);
    if (success) {
      toast.success('Address deleted');
      loadAddresses();
      if (selectedAddress?.id === addressId) {
        onAddressSelect(addresses[0]);
      }
    } else {
      toast.error('Failed to delete address');
    }
  };

  const resetForm = () => {
    setFormData({
      label: '',
      address: '',
      latitude: 0,
      longitude: 0,
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Delivery Address</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-primary hover:text-orange-600 font-medium flex items-center gap-1 text-sm"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <MapPin className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600 mb-4">No saved addresses</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {addresses.map((address) => (
            <div
              key={address.id}
              onClick={() => onAddressSelect(address)}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                selectedAddress?.id === address.id
                  ? 'border-primary bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-1 ${selectedAddress?.id === address.id ? 'text-primary' : 'text-gray-400'}`}>
                    {selectedAddress?.id === address.id ? (
                      <Check size={20} className="font-bold" />
                    ) : (
                      <MapPin size={20} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{address.label}</h4>
                      {address.is_default && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{address.address}</p>
                    {address.city && (
                      <p className="text-xs text-gray-500 mt-1">
                        {address.city}, {address.state} {address.postal_code}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAddress(address.id);
                  }}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">Add New Address</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label (e.g., Home, Office) *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Home"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="House/Flat no., Street, Area, Landmark"
                />
              </div>

              <button
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gettingLocation ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin size={20} />
                    Use Current Location
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="30.7333"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="76.7794"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="Ludhiana"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    placeholder="Punjab"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="141001"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium text-gray-900">Set as default address</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAddress}
                  className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
