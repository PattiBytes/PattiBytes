/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { 
  MapPin, 
  Plus, 
  Trash2, 
  Star, 
  Home, 
  Briefcase,
  Navigation,
  Edit2,
  Phone,
  User as UserIcon,
  Building2,
  MapPinned,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'react-toastify';

interface SavedAddress {
  id: string;
  label: string;
  recipient_name?: string;
  recipient_phone?: string;
  address: string;
  apartment_floor?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  postal_code?: string;
  is_default: boolean;
  delivery_instructions?: string;
  created_at?: string;
}

export default function CustomerAddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<SavedAddress>>({
    label: 'Home',
    recipient_name: '',
    recipient_phone: '',
    address: '',
    apartment_floor: '',
    landmark: '',
    latitude: 0,
    longitude: 0,
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
    delivery_instructions: '',
  });

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  const loadAddresses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

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

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get address
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
      );
      const data = await response.json();

      setFormData({
        ...formData,
        latitude,
        longitude,
        address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        city: data.address?.city || data.address?.town || data.address?.village || '',
        state: data.address?.state || '',
        postal_code: data.address?.postcode || '',
      });

      toast.success('📍 Current location detected');
    } catch (error) {
      console.error('Location error:', error);
      toast.error('Failed to get current location. Please enable location services.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAddressSelect = (addressData: any) => {
    setFormData({
      ...formData,
      address: addressData.address || addressData.display_name,
      latitude: addressData.lat,
      longitude: addressData.lon,
      city: addressData.city || '',
      state: addressData.state || '',
      postal_code: addressData.postal_code || addressData.postcode || '',
    });
  };

  const handleEdit = (address: SavedAddress) => {
    setEditingId(address.id);
    setFormData(address);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validation
    if (!formData.address) {
      toast.error('Please select an address');
      return;
    }

    if (!formData.recipient_name?.trim()) {
      toast.error('Please enter recipient name');
      return;
    }

    if (!formData.recipient_phone?.trim()) {
      toast.error('Please enter phone number');
      return;
    }

    if (formData.recipient_phone && !/^[6-9]\d{9}$/.test(formData.recipient_phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      // If this is set as default, unset all other defaults
      if (formData.is_default) {
        await supabase
          .from('saved_addresses')
          .update({ is_default: false })
          .eq('customer_id', user.id);
      }

      if (editingId) {
        // Update existing address
        const { error } = await supabase
          .from('saved_addresses')
          .update({
            ...formData,
            customer_id: user.id,
          })
          .eq('id', editingId);

        if (error) throw error;
        toast.success('✅ Address updated successfully!');
      } else {
        // Insert new address
        const { error } = await supabase
          .from('saved_addresses')
          .insert([{
            ...formData,
            customer_id: user.id,
          }]);

        if (error) throw error;
        toast.success('✅ Address saved successfully!');
      }

      setShowModal(false);
      resetForm();
      loadAddresses();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error(error.message || 'Failed to save address');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

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

      toast.success('✅ Default address updated');
      loadAddresses();
    } catch (error) {
      toast.error('Failed to update default address');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      label: 'Home',
      recipient_name: user?.full_name || '',
      recipient_phone: '',
      address: '',
      apartment_floor: '',
      landmark: '',
      latitude: 0,
      longitude: 0,
      city: '',
      state: '',
      postal_code: '',
      is_default: false,
      delivery_instructions: '',
    });
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return <Home className="w-5 h-5" />;
      case 'work':
        return <Briefcase className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const getLabelColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return 'from-orange-400 to-pink-500';
      case 'work':
        return 'from-blue-400 to-indigo-500';
      default:
        return 'from-green-400 to-emerald-500';
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
              Saved Addresses
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage your delivery addresses
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all transform active:scale-95"
          >
            <Plus size={20} />
            Add New Address
          </button>
        </div>

        {/* Addresses Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : addresses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-5 border-2 ${
                  address.is_default ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getLabelColor(address.label)} rounded-full flex items-center justify-center text-white shadow-lg`}>
                      {getLabelIcon(address.label)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base sm:text-lg">
                        {address.label}
                      </h3>
                      {address.is_default && (
                        <span className="inline-flex items-center gap-1 text-xs bg-primary text-white px-2 py-1 rounded-full font-semibold mt-1">
                          <Star size={12} fill="currentColor" />
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEdit(address)}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-orange-50 rounded-lg transition-all"
                    title="Edit address"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>

                {/* Recipient Info */}
                {address.recipient_name && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon size={14} className="text-gray-500" />
                      <p className="font-semibold text-sm text-gray-900">
                        {address.recipient_name}
                      </p>
                    </div>
                    {address.recipient_phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-500" />
                        <p className="text-sm text-gray-600">
                          {address.recipient_phone}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Address */}
                <div className="mb-3">
                  <p className="text-gray-700 text-sm line-clamp-2 mb-2">
                    {address.address}
                  </p>
                  
                  {address.apartment_floor && (
                    <div className="flex items-start gap-2 mb-1">
                      <Building2 size={14} className="text-gray-500 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        {address.apartment_floor}
                      </p>
                    </div>
                  )}

                  {address.landmark && (
                    <div className="flex items-start gap-2">
                      <MapPinned size={14} className="text-gray-500 mt-0.5" />
                      <p className="text-xs text-gray-600">
                        Near {address.landmark}
                      </p>
                    </div>
                  )}
                </div>

                {/* Delivery Instructions */}
                {address.delivery_instructions && (
                  <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 {address.delivery_instructions}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t">
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition-all"
                    >
                      <Star size={14} />
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition-all"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 sm:py-20 bg-white rounded-2xl shadow-lg">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin size={40} className="text-white" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              No saved addresses
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-6 px-4">
              Add your first delivery address to get started
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-orange-500 to-pink-500 text-white px-8 py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 font-semibold shadow-lg hover:shadow-xl transition-all transform active:scale-95"
            >
              <Plus size={20} className="inline mr-2" />
              Add Address Now
            </button>
          </div>
        )}

        {/* Add/Edit Address Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto my-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-white p-4 sm:p-6 border-b z-10 flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {editingId ? 'Edit Address' : 'Add New Address'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
                {/* Address Label */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address Label *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Home', 'Work', 'Other'].map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setFormData({ ...formData, label })}
                        className={`p-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                          formData.label === label
                            ? 'border-primary bg-orange-50 text-primary'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {label === 'Home' && '🏠'}
                        {label === 'Work' && '💼'}
                        {label === 'Other' && '📍'}
                        {' '}{label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Recipient Name *
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={formData.recipient_name || ''}
                        onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                        placeholder="Enter name"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="tel"
                        value={formData.recipient_phone || ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormData({ ...formData, recipient_phone: value });
                        }}
                        placeholder="10-digit number"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address Search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Search Address *
                  </label>
                  <AddressAutocomplete
                    onSelect={handleAddressSelect}
                    placeholder="Search for your address..."
                  />
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 font-medium text-sm transition-all disabled:opacity-50"
                  >
                    {locationLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Navigation className="w-4 h-4" />
                    )}
                    Use Current Location
                  </button>
                </div>

                {/* Selected Address Display */}
                {formData.address && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <MapPin size={16} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          ✓ Selected Address:
                        </p>
                        <p className="text-sm text-green-800 leading-relaxed">
                          {formData.address}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Apartment / Floor
                    </label>
                    <input
                      type="text"
                      value={formData.apartment_floor || ''}
                      onChange={(e) => setFormData({ ...formData, apartment_floor: e.target.value })}
                      placeholder="e.g., Flat 201, 2nd Floor"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nearby Landmark
                    </label>
                    <input
                      type="text"
                      value={formData.landmark || ''}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                      placeholder="e.g., City Mall"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Delivery Instructions */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Delivery Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.delivery_instructions || ''}
                    onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                    placeholder="e.g., Ring the bell twice, don't call"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm resize-none transition-all"
                  />
                </div>

                {/* Set as Default */}
                <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-pink-50 rounded-xl cursor-pointer hover:from-orange-100 hover:to-pink-100 transition-all">
                  <input
                    type="checkbox"
                    checked={formData.is_default || false}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      Set as default delivery address
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      This address will be auto-selected for orders
                    </p>
                  </div>
                </label>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 font-semibold transition-all order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.address || !formData.recipient_name || !formData.recipient_phone}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-pink-600 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 order-1 sm:order-2"
                  >
                    <Save size={18} />
                    {editingId ? 'Update Address' : 'Save Address'}
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
