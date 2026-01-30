/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { notificationService } from '@/services/notifications';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { 
  ArrowLeft, 
  Save, 
  Store, 
  Package, 
  ShoppingBag, 
  Upload,
  Plus,
  Edit,
  Trash2,
  FileSpreadsheet,
  User
} from 'lucide-react';
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
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url?: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  total: number;
  items: any[];
  delivery_address: any;
  driver_id?: string;
}

export default function AdminMerchantDetailPage() {
  const params = useParams();
  const router = useRouter();
  useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'menu' | 'orders'>('profile');
  const [uploading, setUploading] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuFormData, setMenuFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    is_available: true,
  });
  const [bulkMenuText, setBulkMenuText] = useState('');

  useEffect(() => {
    if (params.id) {
      loadAll();
    }
  }, [params.id]);

  const loadAll = async () => {
    await Promise.all([
      loadMerchant(),
      loadMenuItems(),
      loadOrders(),
      loadDrivers(),
    ]);
    setLoading(false);
  };

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
    }
  };

  const loadMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('merchant_id', params.id)
        .order('category', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('merchant_id', params.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const loadDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('role', 'driver');

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Failed to load drivers:', error);
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

      setMerchant({ ...merchant, ...updateData as any });
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

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingMenuItem) {
        const { error } = await supabase
          .from('menu_items')
          .update(menuFormData)
          .eq('id', editingMenuItem.id);

        if (error) throw error;
        toast.success('Menu item updated!');
      } else {
        const { error } = await supabase
          .from('menu_items')
          .insert([{
            ...menuFormData,
            merchant_id: params.id,
          }]);

        if (error) throw error;
        toast.success('Menu item added!');
      }

      setShowMenuModal(false);
      setEditingMenuItem(null);
      resetMenuForm();
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save menu item');
    }
  };

  const handleBulkMenuUpload = async () => {
    try {
      const lines = bulkMenuText.trim().split('\n');
      const menuItems = lines.map((line) => {
        const [name, price, category, description] = line.split(',').map((s) => s.trim());
        return {
          name,
          price: parseFloat(price) || 0,
          category: category || 'Other',
          description: description || '',
          merchant_id: params.id,
          is_available: true,
        };
      }).filter((item) => item.name && item.price > 0);

      if (menuItems.length === 0) {
        toast.error('No valid menu items found');
        return;
      }

      const { error } = await supabase
        .from('menu_items')
        .insert(menuItems);

      if (error) throw error;

      toast.success(`${menuItems.length} menu items added!`);
      setShowBulkModal(false);
      setBulkMenuText('');
      loadMenuItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload bulk menu');
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Delete this menu item?')) return;

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Menu item deleted');
      loadMenuItems();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to delete menu item');
    }
  };

  const handleAssignDriver = async (orderId: string, driverId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          driver_id: driverId,
          status: 'on_the_way'
        })
        .eq('id', orderId);

      if (error) throw error;

      // Send notification to driver
      await notificationService.sendNotification(
        driverId,
        'New Delivery Assignment',
        `You have been assigned a new delivery order`,
        'order',
        { order_id: orderId }
      );

      toast.success('Driver assigned!');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign driver');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('user_id, merchant_id, driver_id')
        .eq('id', orderId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Send notifications to all relevant parties
      const notifications = [];

      // Customer
      notifications.push(
        notificationService.sendNotification(
          order.user_id,
          'Order Status Updated',
          `Your order is now ${newStatus}`,
          'order',
          { order_id: orderId }
        )
      );

      // Merchant
      if (order.merchant_id) {
        notifications.push(
          notificationService.sendNotification(
            order.merchant_id,
            'Order Status Updated',
            `Order status changed to ${newStatus}`,
            'order',
            { order_id: orderId }
          )
        );
      }

      // Driver
      if (order.driver_id) {
        notifications.push(
          notificationService.sendNotification(
            order.driver_id,
            'Order Status Updated',
            `Order status changed to ${newStatus}`,
            'order',
            { order_id: orderId }
          )
        );
      }

      await Promise.all(notifications);

      toast.success('Order status updated!');
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update order status');
    }
  };

  const resetMenuForm = () => {
    setMenuFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      is_available: true,
    });
  };

  const openEditMenu = (item: MenuItem) => {
    setEditingMenuItem(item);
    setMenuFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      is_available: item.is_available,
    });
    setShowMenuModal(true);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      on_the_way: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
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
            Orders ({orders.length})
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Menu Items ({menuItems.length})</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                >
                  <FileSpreadsheet size={18} />
                  Bulk Upload
                </button>
                <button
                  onClick={() => {
                    setEditingMenuItem(null);
                    resetMenuForm();
                    setShowMenuModal(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add Item
                </button>
              </div>
            </div>

            {menuItems.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    {item.image_url && (
                      <div className="relative w-full h-32 mb-3 rounded overflow-hidden">
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <h4 className="font-semibold text-lg mb-1">{item.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    <p className="text-primary font-bold text-xl mb-2">₹{item.price}</p>
                    <p className="text-xs text-gray-500 mb-3">{item.category}</p>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditMenu(item)}
                        className="flex-1 bg-blue-100 text-blue-800 px-3 py-2 rounded hover:bg-blue-200 flex items-center justify-center gap-1"
                      >
                        <Edit size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="flex-1 bg-red-100 text-red-800 px-3 py-2 rounded hover:bg-red-200 flex items-center justify-center gap-1"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No menu items yet</p>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-6">Recent Orders ({orders.length})</h3>
            
            {orders.length > 0 ? (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(order.created_at).toLocaleString('en-IN')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="font-bold text-lg text-primary">₹{order.total}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Items</p>
                        <p className="font-semibold">{order.items?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Delivery Address</p>
                        <p className="font-semibold text-sm">{order.delivery_address?.address?.slice(0, 30) || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="preparing">Preparing</option>
                        <option value="on_the_way">On the Way</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      {!order.driver_id && (
                        <select
                          onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Assign Driver</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.full_name} - {driver.phone}
                            </option>
                          ))}
                        </select>
                      )}

                      {order.driver_id && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                          <User size={16} />
                          <span className="text-sm font-medium">Driver Assigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingBag size={64} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No orders yet</p>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Menu Modal */}
        {showMenuModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">
                  {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h2>
              </div>

              <form onSubmit={handleMenuSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={menuFormData.name}
                    onChange={(e) => setMenuFormData({ ...menuFormData, name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={menuFormData.description}
                    onChange={(e) => setMenuFormData({ ...menuFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      value={menuFormData.price}
                      onChange={(e) => setMenuFormData({ ...menuFormData, price: Number(e.target.value) })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <input
                      type="text"
                      value={menuFormData.category}
                      onChange={(e) => setMenuFormData({ ...menuFormData, category: e.target.value })}
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Starters, Main Course"
                      required
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={menuFormData.is_available}
                    onChange={(e) => setMenuFormData({ ...menuFormData, is_available: e.target.checked })}
                    className="w-5 h-5 text-primary"
                  />
                  <span className="font-medium">Available</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenuModal(false);
                      setEditingMenuItem(null);
                      resetMenuForm();
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    {editingMenuItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bulk Upload Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Bulk Menu Upload</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 font-semibold mb-2">Format:</p>
                  <p className="text-sm text-blue-800 font-mono">
                    Item Name, Price, Category, Description
                  </p>
                  <p className="text-xs text-blue-700 mt-2">
                    Example: Paneer Tikka, 250, Starters, Marinated cottage cheese cubes
                  </p>
                </div>

                <textarea
                  value={bulkMenuText}
                  onChange={(e) => setBulkMenuText(e.target.value)}
                  placeholder="Paneer Tikka, 250, Starters, Marinated cottage cheese cubes
Butter Chicken, 350, Main Course, Creamy chicken curry
Gulab Jamun, 80, Desserts, Sweet milk dumplings"
                  rows={10}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary font-mono text-sm"
                />

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkMenuText('');
                    }}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkMenuUpload}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    Upload Menu Items
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
