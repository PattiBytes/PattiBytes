/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/services/auth';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import GoogleOneTapButton from './GoogleOneTapButton';
import { useAuth } from '@/contexts/AuthContext';


export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
const { user: profileUser, loading: authLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
  if (authLoading) return;
  if (!profileUser) return;

  // Same redirect rules you already use after password login
  if (!profileUser.is_active) {
    router.replace('/auth/login?error=account_suspended');
    return;
  }

  if (['merchant', 'driver', 'admin', 'superadmin'].includes(profileUser.role || '')) {
    if (profileUser.approval_status === 'pending') {
      router.replace('/auth/pending-approval');
      return;
    }
    if (profileUser.approval_status === 'rejected') {
      router.replace('/auth/login?error=account_rejected');
      return;
    }
  }

  if (!profileUser.profile_completed && profileUser.role !== 'customer') {
    router.replace(`/${profileUser.role}/profile/complete`);
    return;
  }

  // Final dashboard routing
  if (profileUser.role === 'superadmin') router.replace('/admin/superadmin');
  else if (profileUser.role === 'admin') router.replace('/admin/dashboard');
  else router.replace(`/${profileUser.role}/dashboard`);
}, [authLoading, profileUser, router]);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        'account_suspended': 'Your account has been suspended. Please contact support.',
        'account_rejected': 'Your account application was rejected. Please contact support.',
        'profile_creation_failed': 'Failed to create profile. Please try again.',
        'session_failed': 'Session expired. Please login again.',
      };
      toast.error(errorMessages[error] || 'An error occurred. Please try again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profile = await authService.login(formData.email, formData.password);

      // Check if account is active
      if (!profile.is_active) {
        toast.error('Your account has been suspended. Please contact support.');
        await authService.logout();
        return;
      }

      // Check approval status for non-customer roles
      if (['merchant', 'driver', 'admin', 'superadmin'].includes(profile.role)) {
        // ✅ FIX: Only redirect to pending if actually pending
        if (profile.approval_status === 'pending') {
          toast.warning('Your account is pending approval');
          router.push('/auth/pending-approval');
          return;
        }

        if (profile.approval_status === 'rejected') {
          toast.error('Your account application was rejected. Please contact support.');
          await authService.logout();
          return;
        }
      }

      // Check profile completion
      if (!profile.profile_completed && profile.role !== 'customer') {
        toast.info('Please complete your profile');
        router.push(`/${profile.role}/profile/complete`);
        return;
      }

      // Success message
      toast.success(`Welcome back, ${profile.full_name}!`);

      // ✅ FIX: Handle all role redirects properly
      if (profile.role === 'superadmin') {
        router.push('/admin/superadmin');
      } else if (profile.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push(`/${profile.role}/dashboard`);
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

 
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fadeIn">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-primary mb-6 transition-colors hover-scale"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8 hover-lift">
          <div className="text-center mb-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <Image
                src="/icon-192.png"
                alt="PattiBytes"
                fill
                sizes="80px"
                className="object-contain animate-scaleIn"
                priority
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
            <p className="text-gray-600 mt-2">Sign in to PattiBytes Express</p>
            <p className="text-sm text-primary font-semibold mt-1">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</p>
          </div>

          <GoogleOneTapButton />
         

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-primary rounded focus:ring-primary" />
                <span className="ml-2 text-sm text-gray-700">Remember me</span>
              </label>
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
