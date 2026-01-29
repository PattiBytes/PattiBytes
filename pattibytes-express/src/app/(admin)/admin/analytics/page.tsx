'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag } from 'lucide-react';

export default function AdminAnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Analytics</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Total Revenue</h3>
              <DollarSign className="text-green-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">₹0</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Total Orders</h3>
              <ShoppingBag className="text-blue-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Growth</h3>
              <TrendingUp className="text-orange-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">0%</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 font-medium">Analytics</h3>
              <BarChart3 className="text-purple-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">--</p>
            <p className="text-sm text-gray-500 mt-2">Coming soon</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 text-center">
          <BarChart3 className="mx-auto text-gray-400 mb-4" size={64} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600">Detailed analytics and reports will be available here soon.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
