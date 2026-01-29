'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import ImageUpload from '@/components/common/ImageUpload';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'react-toastify';

export default function AdminSettingsPage() {
  useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    app_name: 'PattiBytes Express',
    app_tagline: 'ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ',
    logo_url: '',
    primary_color: '#f97316',
    delivery_base_charge: 50,
    delivery_per_km_charge: 15,
    delivery_free_above: 500,
    tax_percentage: 5,
    support_email: 'support@pattibytes.com',
    support_phone: '+91-1234567890',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert([settings]);

      if (error) throw error;
      toast.success('Settings saved successfully!');
      
      // Update localStorage for immediate effect
      localStorage.setItem('app_settings', JSON.stringify(settings));
      window.dispatchEvent(new Event('storage'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">App Settings</h1>
            <p className="text-gray-600 mt-1">Manage your app configuration</p>
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Branding */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SettingsIcon size={24} className="text-primary" />
              Branding
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Logo
                </label>
                <div className="w-32 h-32">
                  <ImageUpload
                    type="profile"
                    currentImage={settings.logo_url}
                    onUpload={(url) => setSettings({ ...settings, logo_url: url })}
                    className="h-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  App Name
                </label>
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tagline (Punjabi)
                </label>
                <input
                  type="text"
                  value={settings.app_tagline}
                  onChange={(e) => setSettings({ ...settings, app_tagline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-20 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Charges</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Charge (within 10km)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={settings.delivery_base_charge}
                    onChange={(e) => setSettings({ ...settings, delivery_base_charge: parseFloat(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Per KM Charge (beyond 10km)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">₹</span>
                  <input
                    type="number"
                    value={settings.delivery_per_km_charge}
                    onChange={(e) => setSettings({ ...settings, delivery_per_km_charge: parseFloat(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Free Delivery Above (₹)
                </label>
                <input
                  type="number"
                  value={settings.delivery_free_above}
                  onChange={(e) => setSettings({ ...settings, delivery_free_above: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Percentage (%)
                </label>
                <input
                  type="number"
                  value={settings.tax_percentage}
                  onChange={(e) => setSettings({ ...settings, tax_percentage: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Phone
                </label>
                <input
                  type="tel"
                  value={settings.support_phone}
                  onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
