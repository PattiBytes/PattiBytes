/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, Check, Trash2, Loader2, Navigation } from 'lucide-react';
import { locationService, type SavedAddress } from '@/services/location';
import { toast } from 'react-toastify';

type FormState = {
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  postalcode: string;
  isdefault: boolean;
};

interface AddressSelectorProps {
  userId: string;
  selectedAddress: SavedAddress | null;
  onAddressSelect: (address: SavedAddress) => void;
}

function normalizeReverseGeocode(result: any): {
  address: string;
  city?: string;
  state?: string;
  postalcode?: string;
} {
  // Your project sometimes returns LocationData (object) and sometimes string [file:14]
  if (typeof result === 'string') return { address: result };

  const address =
    String(result?.address || result?.display_name || result?.formatted_address || '').trim();

  const city = result?.city || result?.town || result?.village || '';
  const state = result?.state || '';
  const postalcode = result?.postal_code || result?.postalcode || '';

  return { address, city, state, postalcode };
}

export default function AddressSelector({ userId, selectedAddress, onAddressSelect }: AddressSelectorProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [formData, setFormData] = useState<FormState>({
    label: '',
    address: '',
    latitude: 0,
    longitude: 0,
    city: '',
    state: '',
    postalcode: '',
    isdefault: false,
  });

  const canSave = useMemo(() => {
    return !!formData.label.trim() && !!formData.address.trim() && !!formData.latitude && !!formData.longitude;
  }, [formData]);

  useEffect(() => {
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await locationService.getSavedAddresses(userId);
      setAddresses(data || []);

      if (!selectedAddress && data && data.length > 0) {
        const defaultAddr = data.find((a) => a.isdefault) || data[0]; // ✅ isdefault [file:14]
        onAddressSelect(defaultAddr);
      }
    } finally {
      setLoading(false);
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
      postalcode: '',
      isdefault: false,
    });
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const coords = await locationService.getCurrentLocation();
      const geo = await locationService.reverseGeocode(coords.lat, coords.lon);

      const normalized = normalizeReverseGeocode(geo);

      setFormData((prev) => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lon,
        address: normalized.address, // ✅ string only (fix TS2322) [file:14]
        city: normalized.city || prev.city,
        state: normalized.state || prev.state,
        postalcode: normalized.postalcode || prev.postalcode,
      }));

      toast.success('Location detected!');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!canSave) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // Note: prefer user_id (checkout page had TS error when using userid) [file:14]
      const payload: any = {
        user_id: userId,
        label: formData.label.trim(),
        address: formData.address.trim(),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalcode: formData.postalcode.trim(),
        isdefault: !!formData.isdefault,
      };

      const newAddress = await locationService.saveAddress(payload);

      if (!newAddress) {
        toast.error('Failed to save address');
        return;
      }

      toast.success('Address saved!');
      setShowAddModal(false);
      resetForm();
      await loadAddresses();
      onAddressSelect(newAddress);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm('Delete this address?')) return;

    try {
      const success = await locationService.deleteAddress(addressId);
      if (!success) {
        toast.error('Failed to delete address');
        return;
      }

      toast.success('Address deleted');
      const next = addresses.filter((a) => a.id !== addressId);
      setAddresses(next);

      if (selectedAddress?.id === addressId) {
        const fallback = next.find((a) => a.isdefault) || next[0] || null;
        if (fallback) onAddressSelect(fallback);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete address');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">Delivery Address</h3>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="text-primary hover:text-orange-600 font-semibold flex items-center gap-1 text-sm"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center">
          <MapPin className="mx-auto text-gray-400 mb-2" size={32} />
          <p className="text-gray-600 mb-4">No saved addresses</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-orange-600 font-semibold"
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
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedAddress?.id === address.id ? 'border-primary bg-orange-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`mt-1 ${selectedAddress?.id === address.id ? 'text-primary' : 'text-gray-400'}`}>
                    {selectedAddress?.id === address.id ? <Check size={20} /> : <MapPin size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-bold text-gray-900 truncate">{address.label}</h4>
                      {address.isdefault && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                          Default
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 break-words">{address.address}</p>

                    {(address.city || address.state || (address as any).postalcode || (address as any).postal_code) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {address.city ? `${address.city}, ` : ''}
                        {address.state ? `${address.state} ` : ''}
                        {(address as any).postalcode || (address as any).postal_code || ''}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAddress(address.id);
                  }}
                  className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50"
                  aria-label="Delete address"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Address Modal (mobile bottom-sheet) */}
      {showAddModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddModal(false)} />
          <div className="fixed left-0 right-0 bottom-0 sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:bottom-auto w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-2xl font-bold">Add New Address</h2>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label *</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                  placeholder="Home"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Complete Address *</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                  placeholder="House/Flat no., Street, Area, Landmark"
                />
              </div>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={gettingLocation}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Getting location…
                  </>
                ) : (
                  <>
                    <Navigation size={18} />
                    Use current location
                  </>
                )}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                    placeholder="30.7333"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                    placeholder="76.7794"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                    placeholder="Ludhiana"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                    placeholder="Punjab"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                <input
                  type="text"
                  value={formData.postalcode}
                  onChange={(e) => setFormData({ ...formData, postalcode: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary"
                  placeholder="141001"
                />
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isdefault}
                  onChange={(e) => setFormData({ ...formData, isdefault: e.target.checked })}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium text-gray-900">Set as default address</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  disabled={!canSave}
                  className="flex-1 bg-primary text-white px-5 py-3 rounded-xl hover:bg-orange-600 font-semibold disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
