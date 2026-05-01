/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authService } from '@/services/auth';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Smartphone, ShoppingBag } from 'lucide-react';
import GoogleOneTapButton from './GoogleOneTapButton';
import { useAuth } from '@/contexts/AuthContext';

const APP_STORE_URL  = 'https://apps.apple.com/in/app/pattibytes-express/id6761598840';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pattibytes.express';

function getRedirectPath(profile: any): string {
  if (!profile.is_active) return '/auth/login?error=account_suspended';
  if (['merchant', 'driver', 'admin', 'superadmin'].includes(profile.role ?? '')) {
    if (profile.approval_status === 'pending') return '/auth/pending-approval';
    if (profile.approval_status === 'rejected') return '/auth/login?error=account_rejected';
  }
  if (!profile.profile_completed && profile.role !== 'customer') {
    return `/${profile.role}/profile/complete`;
  }
  if (profile.role === 'superadmin') return '/superadmin/dashboard';
  if (profile.role === 'admin') return '/admin/dashboard';
  return `/${profile.role}/dashboard`;
}

// ── Customer redirect screen ────────────────────────────────────────────────
function CustomerAppScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-orange-600 text-sm transition-colors mb-2">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mx-auto">
            <ShoppingBag className="text-orange-500" size={32} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">Use Our Mobile App</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              PattiBytes Express customers shop through our mobile app.
              Download it free — it&apos;s faster, works offline, and has live order tracking.
            </p>
          </div>

          <div className="space-y-3">
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors w-full justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span><span className="block text-xs opacity-70">Download on the</span>App Store</span>
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-black text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-gray-800 transition-colors w-full justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                <path d="M3.18 23.76c.3.16.65.18.97.07l11.65-6.73-2.6-2.6-10.02 9.26zM.35 1.56C.13 1.9 0 2.33 0 2.86v18.28c0 .53.14.97.36 1.3l.07.07 10.24-10.24v-.24L.42 1.49l-.07.07zM20.8 9.98l-2.95-1.7-2.92 2.92 2.92 2.92 2.97-1.72c.84-.49.84-1.93-.02-2.42zM3.18.24l10.65 10.64-2.6 2.6L.35.31C.66.19 1.01.22 1.34.4l1.84 1.06L3.18.24z"/>
              </svg>
              <span><span className="block text-xs opacity-70">Get it on</span>Google Play</span>
            </a>
          </div>

          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            Are you a merchant, driver, or admin?{' '}
            <Link href="/auth/login" className="text-orange-500 hover:underline font-medium">
              Staff login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main login form ─────────────────────────────────────────────────────────
export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user: profileUser, loading: authLoading } = useAuth();

  const [loading,             setLoading]             = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [isCustomerBlocked,   setIsCustomerBlocked]   = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const hasRedirected = useRef(false);

  // ── Auto-handle already-logged-in users ────────────────────
  useEffect(() => {
    if (authLoading || !profileUser || hasRedirected.current) return;

    // Customer: sign them out silently and show app download screen
    if ((profileUser as any).role === 'customer') {
      supabase.auth.signOut().then(() => setIsCustomerBlocked(true));
      return;
    }

    hasRedirected.current = true;
    router.replace(getRedirectPath(profileUser));
  }, [authLoading, profileUser, router]);

  // ── Query-string errors ─────────────────────────────────────
  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;
    const msgs: Record<string, string> = {
      account_suspended:       'Your account has been suspended. Contact support.',
      account_rejected:        'Your account application was rejected. Contact support.',
      profile_creation_failed: 'Failed to create profile. Please try again.',
      session_failed:          'Session expired. Please login again.',
    };
    toast.error(msgs[error] || 'An error occurred. Please try again.');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || hasRedirected.current) return;
    setLoading(true);

    try {
      const profile = await authService.login(formData.email, formData.password);

      // Block customers from the web portal
      if ((profile as any).role === 'customer') {
        await supabase.auth.signOut();
        setIsCustomerBlocked(true);
        return;
      }

      toast.success(`Welcome back, ${profile.full_name}!`);
      const path = getRedirectPath(profile);
      hasRedirected.current = true;
      router.push(path);
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Show app download screen for customers
  if (isCustomerBlocked) return <CustomerAppScreen />;

  // Don't flash form if already authed as staff
  if (!authLoading && profileUser && (profileUser as any).role !== 'customer') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-700 hover:text-primary mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            {/* ✅ SVG icon — no Image request */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-100 rounded-2xl mx-auto mb-4">
              <ShoppingBag className="text-orange-500" size={36} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">Staff &amp; Business Portal</p>
            <p className="text-sm text-primary font-semibold mt-1">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</p>
          </div>

          {/* Customer notice */}
          <div className="mb-5 flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <Smartphone className="text-orange-400 shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-orange-700">
              <span className="font-semibold">Customer?</span> Please use our{' '}
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">App Store</a>
              {' '}or{' '}
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Play</a>
              {' '}app instead.
            </p>
          </div>

          <GoogleOneTapButton />

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type="email" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="you@example.com" required autoComplete="email" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your password" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-primary rounded" />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><div className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            New business or driver?{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
