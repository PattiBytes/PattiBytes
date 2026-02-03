/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import LocationPicker from '@/components/LocationPicker';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Key, Copy } from 'lucide-react';

function safeJsonCuisineToArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') {
    const s = v.trim();
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

export default function AdminAddMerchantPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

  const [formData, setFormData] = useState({
    business_name: '',
    business_type: 'restaurant',
    email: '',
    phone: '',
    description: '',
    cuisine_types_text: 'North Indian',
    latitude: 30.901,
    longitude: 75.8573,
    address: '',
    city: '',
    state: 'Punjab',
    postal_code: '',
    delivery_radius_km: 10,
    min_order_amount: 100,
    estimated_prep_time: 30,
    commission_rate: 10,
    gst_enabled: false,
    gst_percentage: 5,
  });

  const cuisine_types = useMemo(
    () => safeJsonCuisineToArray(formData.cuisine_types_text),
    [formData.cuisine_types_text]
  );

  const copyCreds = async () => {
    if (!createdCreds) return;
    const text = `Email: ${createdCreds.email}\nPassword: ${createdCreds.password}`;
    await navigator.clipboard.writeText(text);
    toast.success('Credentials copied');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatedCreds(null);

    try {
      setSubmitting(true);

      const { data } = await supabase.auth.getSession();
      const jwt = data.session?.access_token;
      if (!jwt) throw new Error('No session. Please login again.');

      const res = await fetch('/api/admin/create-merchant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          business_name: formData.business_name,
          business_type: formData.business_type,
          cuisine_types,
          description: formData.description,
          phone: formData.phone,
          email: formData.email,
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          delivery_radius_km: formData.delivery_radius_km,
          min_order_amount: formData.min_order_amount,
          estimated_prep_time: formData.estimated_prep_time,
          commission_rate: formData.commission_rate,
          gst_enabled: formData.gst_enabled,
          gst_percentage: formData.gst_percentage,
          is_active: true,
          is_verified: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create restaurant');

      setCreatedCreds(json.credentials);

      toast.success('Restaurant created! Scroll down to copy credentials.', { autoClose: 4000 });
      // Optional: router.push('/admin/merchants');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Failed to create restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div
        className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden"
        style={{ paddingBottom: `calc(88px + env(safe-area-inset-bottom))` }}
      >
        <div className="flex items-center justify-between gap-3 mb-6 min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 shrink-0"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate min-w-0">
            Add New Restaurant
          </h1>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
            <input
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full max-w-full px-4 py-3 border rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Types (comma or JSON)</label>
            <input
              value={formData.cuisine_types_text}
              onChange={(e) => setFormData({ ...formData, cuisine_types_text: e.target.value })}
              className="w-full max-w-full px-4 py-3 border rounded-lg"
              placeholder='North Indian, Chinese OR ["North Indian"]'
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Restaurant Location * (Click on map to select)
            </label>
            <div className="w-full max-w-full overflow-hidden rounded-xl border">
              <LocationPicker
                onLocationSelect={(location) => {
                  setFormData({
                    ...formData,
                    latitude: location.lat,
                    longitude: location.lon,
                    address: location.address,
                  });
                }}
                initialLat={formData.latitude}
                initialLon={formData.longitude}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Radius (km)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={formData.delivery_radius_km}
                onChange={(e) => setFormData({ ...formData, delivery_radius_km: Number(e.target.value) })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Amount</label>
              <input
                type="number"
                min={0}
                value={formData.min_order_amount}
                onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
              <input
                type="number"
                min={5}
                value={formData.estimated_prep_time}
                onChange={(e) => setFormData({ ...formData, estimated_prep_time: Number(e.target.value) })}
                className="w-full max-w-full px-4 py-3 border rounded-lg"
              />
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2 min-w-0">
              <Key className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div className="min-w-0">
                <p className="font-semibold text-blue-900 mb-1">Auto-Generated Credentials</p>
                <p className="text-sm text-blue-800">
                  After creation, you can copy the email/password and share with the merchant.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 flex-col sm:flex-row">
            <button
              type="button"
              onClick={() => router.push('/admin/merchants')}
              className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
            >
              {submitting ? 'Creating…' : 'Create Restaurant'}
            </button>
          </div>

          {createdCreds && (
            <div className="border rounded-xl p-4 bg-white">
              <p className="font-bold text-gray-900 mb-2">Created Credentials</p>
              <div className="text-sm text-gray-700 space-y-1 break-words">
                <div><span className="font-semibold">Email:</span> {createdCreds.email}</div>
                <div><span className="font-semibold">Password:</span> {createdCreds.password}</div>
              </div>
              <button
                type="button"
                onClick={copyCreds}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50 font-semibold"
              >
                <Copy size={16} />
                Copy credentials
              </button>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
}
