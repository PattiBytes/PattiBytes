/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/services/auth';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import GoogleOneTapButton from './GoogleOneTapButton';
import { useAuth } from '@/contexts/AuthContext';

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

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user: profileUser, loading: authLoading } = useAuth();

  const [loading, setLoading]           = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData]         = useState({ email: '', password: '' });

  // ✅ Prevent double-redirect: handleSubmit AND useEffect both try to navigate
  const hasRedirected = useRef(false);

  // ── Auto-redirect if already logged in (Google One-Tap, session restore) ──
  useEffect(() => {
    if (authLoading || !profileUser || hasRedirected.current) return;
    hasRedirected.current = true;
    router.replace(getRedirectPath(profileUser));
  }, [authLoading, profileUser, router]);

  // ── Show error from query string ─────────────────────────────────────────
  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;
    const msgs: Record<string, string> = {
      account_suspended:      'Your account has been suspended. Contact support.',
      account_rejected:       'Your account application was rejected. Contact support.',
      profile_creation_failed:'Failed to create profile. Please try again.',
      session_failed:         'Session expired. Please login again.',
    };
    toast.error(msgs[error] || 'An error occurred. Please try again.');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || hasRedirected.current) return;
    setLoading(true);

    try {
      const profile = await authService.login(formData.email, formData.password);
      toast.success(`Welcome back, ${profile.full_name}!`);
      const path = getRedirectPath(profile);

      // ✅ Mark redirected BEFORE calling router.push so the useEffect skips
      hasRedirected.current = true;
      router.push(path);
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Don't flash the form if already authed
  if (!authLoading && profileUser) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fadeIn">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-700 hover:text-primary mb-6 transition-colors">
          <ArrowLeft size={20} /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <Image src="/icon-192.png" alt="PattiBytes" fill sizes="80px" className="object-contain" priority />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">Sign in to PattiBytes Express</p>
            <p className="text-sm text-primary font-semibold mt-1">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</p>
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
                <input
                  type="email" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="you@example.com" required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your password" required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
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
              {loading
                ? <><div className="spinner" /> Signing in...</>
                : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
