'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Wallet, TrendingUp, Calendar, Download } from 'lucide-react';

export default function DriverEarningsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    deliveries: 0,
  });

  useEffect(() => {
    loadEarnings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadEarnings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // This would fetch from orders table with driver_id
      // For now, showing placeholder
      setStats({
        today: 450,
        thisWeek: 2800,
        thisMonth: 12500,
        total: 45000,
        deliveries: 156,
      });
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Earnings</h1>
            <p className="text-gray-600 mt-1">Track your delivery earnings</p>
          </div>
          <button className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center gap-2">
            <Download size={20} />
            Download Report
          </button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Calendar size={24} />
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    Today
                  </span>
                </div>
                <h3 className="text-3xl font-bold mb-1">₹{stats.today}</h3>
                <p className="text-green-100 text-sm">Today&apos;s earnings</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp size={24} />
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    Week
                  </span>
                </div>
                <h3 className="text-3xl font-bold mb-1">₹{stats.thisWeek}</h3>
                <p className="text-blue-100 text-sm">This week</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <Wallet size={24} />
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    Month
                  </span>
                </div>
                <h3 className="text-3xl font-bold mb-1">₹{stats.thisMonth}</h3>
                <p className="text-purple-100 text-sm">This month</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp size={24} />
                  <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    Total
                  </span>
                </div>
                <h3 className="text-3xl font-bold mb-1">₹{stats.total}</h3>
                <p className="text-orange-100 text-sm">{stats.deliveries} deliveries</p>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Detailed Earnings Coming Soon
              </h3>
              <p className="text-gray-600">
                We&apos;re working on detailed earnings reports and transaction history
              </p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
