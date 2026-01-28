/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Search, Edit, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface Merchant {
  id: string;
  business_name: string;
  owner_id: string;
}

interface MenuItem {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
}

export default function AdminMenusPage() {
  const { user } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'Main Course',
    image_url: '',
    is_available: true,
    is_veg: true,
  });
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    loadMerchants();
  }, []);

  useEffect(() => {
    if (selectedMerchant) {
      loadMenuItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMerchant]);

  const loadMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('id, business_name, owner_id')
        .eq('is_verified', true)
        .order('business_name');

      if (error) throw error;
      setMerchants(data as Merchant[]);
    } catch (error) {
      toast.error('Failed to load merchants');
    }
  };

  const loadMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', selectedMerchant)
        .order('category');

      if (error) throw error;
      setMenuItems(data as MenuItem[]);
    } catch (error) {
      toast.error('Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'menu-items');
      setFormData({ ...formData, image_url: url });
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update(formData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('Menu item updated successfully');
      } else {
        // Create new item
        const { error } = await supabase
          .from('menu_items')
          .insert([{ ...formData, merchant_id: selectedMerchant }]);

        if (error) throw error;
        toast.success('Menu item added successfully');
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'Main Course',
        image_url: '',
        is_available: true,
        is_veg: true,
      });
      loadMenuItems();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error.message || 'Failed to save menu item');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image_url: item.image_url || '',
      is_available: item.is_available,
      is_veg: item.is_veg,
    });
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Menu item deleted successfully');
      loadMenuItems();
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  const filteredItems = menuItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-gray-600 mt-1">Manage menus for all restaurants</p>
          </div>
        </div>

        {/* Merchant Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Restaurant
          </label>
          <select
            value={selectedMerchant}
            onChange={(e) => setSelectedMerchant(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Choose a restaurant...</option>
            {merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.business_name}
              </option>
            ))}
          </select>
        </div>

        {selectedMerchant && (
          <>
            {/* Actions Bar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search menu items..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setFormData({
                    name: '',
                    description: '',
                    price: 0,
                    category: 'Main Course',
                    image_url: '',
                    is_available: true,
                    is_veg: true,
                  });
                  setShowModal(true);
                }}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
              >
                <Plus size={20} />
                Add Item
              </button>
            </div>

            {/* Menu Items Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <Upload size={64} className="mx-auto text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">No menu items</h2>
                <p className="text-gray-600">Add items to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <Upload size={48} className="text-gray-400" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.category}</p>
                        </div>
                        <div className="flex gap-1">
                          <span className={`text-xs px-2 py-1 rounded ${item.is_veg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {item.is_veg ? 'Veg' : 'Non-veg'}
                          </span>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-primary mb-3">₹{item.price}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 font-medium flex items-center justify-center gap-2"
                        >
                          <Edit size={16} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 font-medium flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option>Starters</option>
                      <option>Main Course</option>
                      <option>Desserts</option>
                      <option>Beverages</option>
                      <option>Breads</option>
                      <option>Rice</option>
                      <option>Snacks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Image
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary transition-colors">
                        <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                        <p className="text-sm text-gray-600">
                          {uploading ? 'Uploading...' : 'Click to upload image'}
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_veg}
                      onChange={(e) => setFormData({ ...formData, is_veg: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Vegetarian</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="w-5 h-5 text-primary rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Available</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || uploading}
                    className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item'}
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
