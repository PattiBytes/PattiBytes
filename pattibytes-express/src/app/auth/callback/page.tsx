'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    try {
      // Get the code from URL
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session?.user) {
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, approval_status, profile_completed')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          router.push('/');
          return;
        }

        // Check approval status for merchant/driver
        if ((profile.role === 'merchant' || profile.role === 'driver') && 
            profile.approval_status === 'pending') {
          router.push('/auth/pending-approval');
          return;
        }

        // Check if profile is completed
        if (!profile.profile_completed && profile.role !== 'customer') {
          router.push(`/${profile.role}/profile/complete`);
          return;
        }

        // Redirect to appropriate dashboard
        if (profile.role === 'customer') {
          router.push('/customer/dashboard');
        } else if (profile.role === 'merchant') {
          router.push('/merchant/dashboard');
        } else if (profile.role === 'driver') {
          router.push('/driver/dashboard');
        } else if (profile.role === 'admin' || profile.role === 'superadmin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/');
        }
      } else {
        router.push('/auth/login');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Auth callback error:', error);
      setError(error.message || 'Authentication failed');
      setTimeout(() => router.push('/auth/login'), 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✕</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <Loader2 className="animate-spin text-primary mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Authenticating...</h2>
        <p className="text-gray-600">Please wait while we log you in</p>
      </div>
    </div>
  );
}
