'use client';

import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Settings, Bell, Shield, Palette } from 'lucide-react';

export default function AdminSettingsPage() {
  useAuth();

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage system settings and preferences</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Bell className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Notifications</h3>
                <p className="text-sm text-gray-600">Configure notification preferences</p>
              </div>
            </div>
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium">
              Manage
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Security</h3>
                <p className="text-sm text-gray-600">Password and authentication</p>
              </div>
            </div>
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium">
              Manage
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Palette className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Appearance</h3>
                <p className="text-sm text-gray-600">Theme and display settings</p>
              </div>
            </div>
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium">
              Manage
            </button>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Settings className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">General</h3>
                <p className="text-sm text-gray-600">General app settings</p>
              </div>
            </div>
            <button className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 font-medium">
              Manage
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
