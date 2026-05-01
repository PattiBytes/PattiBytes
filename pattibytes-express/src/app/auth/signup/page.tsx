/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth';
import { sendNotification } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, ShoppingBag, Smartphone } from 'lucide-react';

const APP_STORE_URL  = 'https://apps.apple.com/in/app/pattibytes-express/id6761598840';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pattibytes.express';

// ── Roles allowed to register on the web portal ─────────────────────────────
const ALLOWED_ROLES = ['merchant', 'driver', 'admin'];

function SignupForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const roleParam    = searchParams.get('role') || 'merchant'; // default merchant; never customer

  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '', email: '', phone: '', password: '',
    // Clamp to allowed roles only — block customer even if passed via URL
    role: ALLOWED_ROLES.includes(roleParam) ? roleParam : 'merchant',
  });

  const notifyAdmins = async (userName: string, userRole: string, userId: string) => {
    try {
      const { data: admins, error } = await supabase
        .from('profiles').select('id, full_name').in('role', ['admin', 'superadmin']);
      if (error || !admins?.length) return;

      await Promise.all(admins.map(admin =>
        sendNotification(
          admin.id,
          'New Account Approval Required',
          `${userName} has registered as a ${userRole} and needs approval.`,
          'approval',
          { user_id: userId, user_role: userRole },
          { url: '/admin/dashboard' },
        )
      ));
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Extra guard — customers must use mobile app
    if (formData.role === 'customer') {
      toast.error('Customers must register through the PattiBytes mobile app.');
      return;
    }
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!formData.phone || formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      const { userId } = await authService.signup(
        formData.email, formData.password,
        formData.fullName, formData.phone, formData.role,
      );

      await notifyAdmins(formData.fullName, formData.role, userId);
      toast.success('Account created successfully!');

      setTimeout(async () => {
        try {
          const profile = await authService.login(formData.email, formData.password);

          if (['merchant', 'driver', 'admin'].includes(profile.role)) {
            if (profile.approval_status === 'pending') {
              toast.info('Your account is pending approval. Admins have been notified.');
              router.push('/auth/pending-approval');
              return;
            }
          }

          toast.success(`Welcome ${profile.full_name}!`);
          router.push(`/${profile.role}/dashboard`);
        } catch {
          toast.info('Please login with your credentials');
          router.push('/auth/login');
        }
      }, 1500);
    } catch (error: any) {
      console.error('Signup failed:', error);
      toast.error(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-700 hover:text-primary mb-6 transition-colors hover-scale">
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 hover-lift">
          <div className="text-center mb-6">
            {/* ✅ SVG icon — no Image request */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-2xl mx-auto mb-4">
              <ShoppingBag className="text-orange-500" size={36} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">Business &amp; Staff Registration</p>
            <p className="text-sm text-primary font-semibold mt-1">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</p>
          </div>

          {/* ── Customer notice — prominent at top ── */}
          <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="text-orange-400 shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-800">Customer? Use our app instead</p>
                <p className="text-xs text-orange-600 mt-0.5 mb-3">
                  This portal is for merchants, drivers &amp; admins only. Customers must use the mobile app.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-black text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors font-medium">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    App Store
                  </a>
                  <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-black text-white text-xs px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors font-medium">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M3.18 23.76c.3.16.65.18.97.07l11.65-6.73-2.6-2.6-10.02 9.26zM.35 1.56C.13 1.9 0 2.33 0 2.86v18.28c0 .53.14.97.36 1.3l.07.07 10.24-10.24v-.24L.42 1.49l-.07.07zM20.8 9.98l-2.95-1.7-2.92 2.92 2.92 2.92 2.97-1.72c.84-.49.84-1.93-.02-2.42zM3.18.24l10.65 10.64-2.6 2.6L.35.31C.66.19 1.01.22 1.34.4l1.84 1.06L3.18.24z"/>
                    </svg>
                    Google Play
                  </a>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="text" value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="John Doe" required minLength={2} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="email" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="tel" value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="+91 9876543210" required minLength={10} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Min 6 characters" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">I am registering as</label>
              <select value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                {/* ✅ No customer option — customers use the mobile app */}
                <option value="merchant">🏪 Restaurant / Store Owner</option>
                <option value="driver">🚗 Delivery Partner</option>
                <option value="admin">🛠️ Admin</option>
              </select>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ℹ️ Your account will be reviewed by our admin team. You&apos;ll receive a notification once approved.
              </p>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading
                ? <><div className="spinner" /> Creating account...</>
                : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
