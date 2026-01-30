/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { ArrowLeft, Save, Store, Package, ShoppingBag, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import Image from 'next/image';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface Merchant {
  id: string;
  business_name: string;
  email: string;
  phone: string;
  address: any;
  cuisine_types: string[];
  description: string;
  logo_url: string;
  banner_url: string;
  is_active: boolean;
  is_verified: boolean;
  latitude: number;
  longitude: number;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
}

export default function AdminMerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'menu' | 'orders'>('profile');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadMerchant();
      loadMenuItems();
    }
  }, [params.id]);

  const loadMerchant = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setMerchant(data);
    } catch (error) {
      console.error('Failed to load merchant:', error);
      toast.error('Failed to load merchant');
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', params.id);

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !merchant) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, `merchants/${type}`);
      
      const updateData = type === 'logo' ? { logo_url: url } : { banner_url: url };
      
      const { error } = await supabase
        .from('merchants')
        .update(updateData)
        .eq('id', merchant.id);

      if (error) throw error;

      setMerchant({ ...merchant, ...updateData });
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} updated successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!merchant) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('merchants')
        .update({
          business_name: merchant.business_name,
          email: merchant.email,
          phone: merchant.phone,
          description: merchant.description,
          cuisine_types: merchant.cuisine_types,
          is_active: merchant.is_active,
          is_verified: merchant.is_verified,
        })
        .eq('id', merchant.id);

      if (error) throw error;
      toast.success('Merchant updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update merchant');
    } finally {
      setSaving(false);
    }
  };

  const toggleMenuItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !currentStatus })
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Menu item updated');
      loadMenuItems();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to update menu item');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!merchant) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600">Merchant not found</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{merchant.business_name}</h1>
            <p className="text-gray-600 mt-1">Manage merchant account</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600'
            }`}
          >
            <Store size={20} />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === 'menu'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600'
            }`}
          >
            <Package size={20} />
            Menu ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600'
            }`}
          >
            <ShoppingBag size={20} />
            Orders
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Images */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo
                </label>
                <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                  {merchant.logo_url ? (
                    <Image
                      src={merchant.logo_url}
                      alt="Logo"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Upload className="text-gray-400" size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'logo')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner
                </label>
                <div className="relative w-full h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                  {merchant.banner_url ? (
                    <Image
                      src={merchant.banner_url}
                      alt="Banner"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Upload className="text-gray-400" size={32} />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={merchant.business_name}
                  onChange={(e) => setMerchant({ ...merchant, business_name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={merchant.email}
                  onChange={(e) => setMerchant({ ...merchant, email: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={merchant.phone}
                  onChange={(e) => setMerchant({ ...merchant, phone: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuisine Types
                </label>
                <input
                  type="text"
                  value={merchant.cuisine_types?.join(', ') || ''}
                  onChange={(e) => setMerchant({ ...merchant, cuisine_types: e.target.value.split(',').map(s => s.trim()) })}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Punjabi, Chinese, Italian"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={merchant.description}
                onChange={(e) => setMerchant({ ...merchant, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Status Toggles */}
            <div className="flex gap-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={merchant.is_active}
                  onChange={(e) => setMerchant({ ...merchant, is_active: e.target.checked })}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium">Active</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={merchant.is_verified}
                  onChange={(e) => setMerchant({ ...merchant, is_verified: e.target.checked })}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium">Verified</span>
              </label>
            </div>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Menu Items ({menuItems.length})</h3>
            {menuItems.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-primary font-bold">₹{item.price}</p>
                    <p className="text-sm text-gray-600">{item.category}</p>
                    <button
                      onClick={() => toggleMenuItemAvailability(item.id, item.is_available)}
                      className={`mt-2 px-3 py-1 rounded text-sm ${
                        item.is_available
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.is_available ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No menu items yet</p>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Recent Orders</h3>
            <p className="text-gray-600">Order management coming soon...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
