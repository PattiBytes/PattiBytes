/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { authService } from '@/services/auth';
import { notificationService } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') || 'customer';
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: roleParam,
  });

  const notifyAdmins = async (userName: string, userRole: string, userId: string) => {
    try {
      // Get all admins and superadmins
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['admin', 'superadmin']);

      if (error) {
        console.error('Error fetching admins:', error);
        return;
      }

      if (!admins || admins.length === 0) {
        console.log('No admins found to notify');
        return;
      }

      // Send notification to each admin
      const notifications = admins.map((admin) =>
        notificationService.sendNotification(
          admin.id,
          'New Account Approval Required',
          `${userName} has registered as a ${userRole} and needs approval.`,
          'approval',
          { user_id: userId, user_role: userRole }
        )
      );

      await Promise.all(notifications);
      console.log(`Notified ${admins.length} admins`);
    } catch (error) {
      console.error('Failed to notify admins:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      // Signup user
      const { userId } = await authService.signup(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        formData.role
      );

      console.log('User created with ID:', userId);

      // Notify admins if merchant/driver/admin
      if (['merchant', 'driver', 'admin'].includes(formData.role)) {
        await notifyAdmins(formData.fullName, formData.role, userId);
      }

      toast.success('Account created successfully!');
      
      // Auto login after signup
      setTimeout(async () => {
        try {
          const profile = await authService.login(formData.email, formData.password);
          
          // Check if needs approval
          if (['merchant', 'driver', 'admin'].includes(profile.role)) {
            if (profile.approval_status === 'pending') {
              toast.info('Your account is pending approval. Admins have been notified.');
              router.push('/auth/pending-approval');
              return;
            }
          }

          // Redirect to dashboard
          toast.success(`Welcome ${profile.full_name}!`);
          router.push(`/${profile.role}/dashboard`);
        } catch (loginError: any) {
          console.error('Auto-login failed:', loginError);
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
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">Join PattiBytes Express</p>
            <p className="text-sm text-primary font-semibold mt-1">ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="John Doe"
                  required
                  minLength={2}
                />
              </div>
            </div>

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
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="+91 9876543210"
                  required
                  minLength={10}
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
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="customer">🍔 Customer</option>
                <option value="merchant">🏪 Restaurant Owner</option>
                <option value="driver">🚗 Delivery Partner</option>
              </select>
            </div>

            {(formData.role === 'merchant' || formData.role === 'driver') && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  ℹ️ Your account will be reviewed by our admin team. You&apos;ll receive a notification once approved.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
