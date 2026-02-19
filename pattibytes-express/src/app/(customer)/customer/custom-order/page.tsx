/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { ArrowLeft, Send, Loader2, CheckCircle } from 'lucide-react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

function CustomOrderForm() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'custom';

  const [formData, setFormData] = useState({
    category,
    name: '',
    phone: '',
    email: '',
    orderDetails: '',
    budget: '',
    deliveryDate: '',
    deliveryTime: '',
    address: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: (user as any).full_name || '',
        email: user.email || '',
        phone: (user as any).phone || '',
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.orderDetails.trim()) {
      toast.error('Please describe your order');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('customorders').insert({
        customerid: user?.id || null,
        category: formData.category,
        customername: formData.name,
        customerphone: formData.phone,
        customeremail: formData.email,
        orderdetails: formData.orderDetails,
        budget: formData.budget || null,
        deliverydate: formData.deliveryDate || null,
        deliverytime: formData.deliveryTime || null,
        deliveryaddress: formData.address || null,
        status: 'pending',
        createdat: new Date().toISOString(),
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Custom order submitted! We\'ll contact you soon.');

      setTimeout(() => {
        router.push('/customer-dashboard');
      }, 3000);
    } catch (e: any) {
      console.error('Submit error:', e);
      toast.error(e?.message || 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-green-200 p-8 max-w-md w-full text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Order Submitted!</h2>
          <p className="text-gray-600 mb-4">
            We&apos;ve received your custom order request. Our team will contact you within 24 hours.
          </p>
          <button
            onClick={() => router.push('/customer-dashboard')}
            className="w-full bg-gradient-to-r from-primary to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 pb-8">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Custom Order</h1>
              <p className="text-sm text-gray-600">Tell us what you need</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 space-y-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Order Type</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
              >
                <option value="birthday">Birthday Special</option>
                <option value="bulk">Bulk Order</option>
                <option value="custom">Custom Menu</option>
                <option value="corporate">Corporate Catering</option>
                <option value="wedding">Wedding/Event</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Your Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="John Doe"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="john@example.com"
              />
            </div>

            {/* Order Details */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Order Details *</label>
              <textarea
                required
                value={formData.orderDetails}
                onChange={(e) => setFormData({ ...formData, orderDetails: e.target.value })}
                rows={5}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                placeholder="Describe what you want... (e.g., 2kg chocolate cake with custom design, serves 20 people)"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Budget (₹)</label>
              <input
                type="text"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g., 5000"
              />
            </div>

            {/* Delivery Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Date</label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Time</label>
                <input
                  type="time"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                placeholder="Full delivery address with pincode"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-pink-600 text-white py-4 rounded-xl font-black text-lg hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Order Request
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Our team will review your request and contact you within 24 hours with a quote and confirmation.
            </p>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CustomOrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <CustomOrderForm />
    </Suspense>
  );
}
