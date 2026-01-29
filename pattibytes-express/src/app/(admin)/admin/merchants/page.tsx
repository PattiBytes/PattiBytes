'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Store, Mail, Phone, MapPin, Trash2, Key } from 'lucide-react';
import { toast } from 'react-toastify';
import { Merchant } from '@/types';

export default function AdminMerchantsPage() {
  const { user } = useAuth();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Punjab',
    zipcode: '',
    cuisine_type: '',
    description: '',
  });

  useEffect(() => {
    if (user) loadMerchants();
     
  }, [user]);

  const loadMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMerchants(data as Merchant[] || []);
    } catch (error) {
      console.error('Failed to load merchants:', error);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  };

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Generate random password
      const tempPassword = generatePassword();
      const merchantEmail = formData.email;

      // 1. Create auth user for merchant
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: merchantEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: formData.business_name,
          phone: formData.phone,
        },
      });

      if (authError) throw authError;

      // 2. Update profile with merchant role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'merchant',
          full_name: formData.business_name,
          phone: formData.phone,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // 3. Create merchant record
      const { error: merchantError } = await supabase
        .from('merchants')
        .insert([
          {
            user_id: authData.user.id,
            owner_id: authData.user.id,
            business_name: formData.business_name,
            email: merchantEmail,
            phone: formData.phone,
            address: {
              address: formData.address,
              city: formData.city,
              state: formData.state,
              zipcode: formData.zipcode,
            },
            cuisine_type: formData.cuisine_type,
            description: formData.description,
            is_active: true,
            is_verified: true,
          },
        ]);

      if (merchantError) throw merchantError;

      // Show credentials to admin
      toast.success(
        `Restaurant added! Credentials:\nEmail: ${merchantEmail}\nPassword: ${tempPassword}\n\n⚠️ Save these credentials!`,
        { autoClose: false }
      );

      // Optional: Send email with credentials (if email service configured)
      await sendCredentialsEmail(merchantEmail, tempPassword, formData.business_name);

      setShowAddModal(false);
      setFormData({
        business_name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: 'Punjab',
        zipcode: '',
        cuisine_type: '',
        description: '',
      });
      loadMerchants();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to add merchant:', error);
      toast.error(error.message || 'Failed to add restaurant');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendCredentialsEmail = async (email: string, password: string, business_name?: string) => {
    // Implement email sending logic here
    console.log('Send email to:', email, 'Password:', password);
    // You can use services like SendGrid, Resend, or nodemailer
  };

  const handleDelete = async (merchantId: string) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return;

    try {
      const { error } = await supabase
        .from('merchants')
        .delete()
        .eq('id', merchantId);

      if (error) throw error;
      toast.success('Restaurant deleted');
      loadMerchants();
    } catch (error) {
      console.error('Failed to delete merchant:', error);
      toast.error('Failed to delete restaurant');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage Restaurants</h1>
            <p className="text-gray-600 mt-1">Add and manage restaurant partners</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 shadow-lg"
          >
            <Plus size={20} />
            Add Restaurant
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : merchants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {merchants.map((merchant) => (
              <div key={merchant.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                      <Store className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{merchant.business_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${merchant.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {merchant.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Mail size={16} />
                    <span className="truncate">{merchant.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} />
                    <span>{merchant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span className="truncate">{merchant.address?.address || 'No address'}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                  <button
                    onClick={() => handleDelete(merchant.id)}
                    className="flex-1 bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 font-medium flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <Store size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No restaurants yet</h3>
            <p className="text-gray-600">Add your first restaurant partner</p>
          </div>
        )}

        {/* Add Restaurant Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Add New Restaurant</h2>
              </div>

              <form onSubmit={handleAddMerchant} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={formData.zipcode}
                      onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuisine Type
                  </label>
                  <input
                    type="text"
                    value={formData.cuisine_type}
                    onChange={(e) => setFormData({ ...formData, cuisine_type: e.target.value })}
                    placeholder="e.g., Punjabi, Chinese, Italian"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Key className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Auto-Generated Credentials</p>
                      <p className="text-sm text-blue-800">
                        A random password will be generated and displayed after creation. 
                        The merchant can login with their email and change the password later.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium"
                  >
                    Add Restaurant
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
