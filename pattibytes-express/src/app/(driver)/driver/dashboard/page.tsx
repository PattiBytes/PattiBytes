/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Truck, DollarSign, Package, TrendingUp, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/common/MapView'), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-200 animate-pulse rounded-lg" />,
});

export default function DriverDashboard() {
  const { user } = useAuth();
  const [isAvailable, setIsAvailable] = useState(false);
  const [stats] = useState({
    todayDeliveries: 8,
    todayEarnings: 450,
    totalDeliveries: 156,
    avgRating: 4.8,
  });
  const [activeDeliveries, setActiveDeliveries] = useState<any[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number]>([30.9010, 75.8573]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => console.log('Location access denied')
      );
    }

    // Mock active deliveries
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveDeliveries([
      {
        id: '1',
        orderId: 'ORD-001',
        restaurant: 'Pizza Palace',
        customer: 'John Doe',
        address: 'Model Town, Ludhiana',
        distance: '2.3 km',
        time: '15 min',
        amount: 350,
      },
    ]);
  }, []);

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Availability Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {user?.full_name}!</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">
              {isAvailable ? 'Available' : 'Offline'}
            </span>
            <button
              onClick={toggleAvailability}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  isAvailable ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&apos;s Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayDeliveries}</p>
              </div>
              <Truck className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Today&lsquo;s Earnings</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.todayEarnings}</p>
              </div>
              <DollarSign className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalDeliveries}</p>
              </div>
              <Package className="text-purple-500" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgRating}</p>
              </div>
              <TrendingUp className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Map View */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Location</h2>
          <div className="h-96 rounded-lg overflow-hidden">
            <MapView
              center={currentLocation}
              zoom={14}
              markers={[
                {
                  position: currentLocation,
                  popup: 'Your Location',
                },
              ]}
            />
          </div>
        </div>

        {/* Active Deliveries */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Deliveries</h2>
            <Link href="/driver/deliveries" className="text-primary hover:underline">
              View All
            </Link>
          </div>

          {activeDeliveries.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">No active deliveries</p>
              {!isAvailable && (
                <p className="text-sm text-gray-500">
                  Turn on availability to receive delivery requests
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeDeliveries.map((delivery) => (
                <Link
                  key={delivery.id}
                  href={`/driver/deliveries/${delivery.id}`}
                  className="block p-6 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Order #{delivery.orderId}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        From: {delivery.restaurant}
                      </p>
                      <p className="text-sm text-gray-600">To: {delivery.customer}</p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      <span>{delivery.distance}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      <span>{delivery.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={16} />
                      <span>₹{delivery.amount}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-orange-600">
                      View Details
                    </button>
                    <button className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200">
                      Navigate
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <p className="text-blue-100">This Week</p>
            <p className="text-3xl font-bold mt-2">42 Deliveries</p>
            <p className="text-blue-100 mt-1">+12% from last week</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <p className="text-green-100">This Month</p>
            <p className="text-3xl font-bold mt-2">₹12,450</p>
            <p className="text-green-100 mt-1">Total earnings</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <p className="text-purple-100">Performance</p>
            <p className="text-3xl font-bold mt-2">98%</p>
            <p className="text-purple-100 mt-1">On-time delivery</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
