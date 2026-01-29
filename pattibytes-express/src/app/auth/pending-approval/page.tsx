'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, XCircle, LogOut, ShoppingBag } from 'lucide-react';

export default function PendingApprovalPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkApprovalStatus();
      
      // Poll every 10 seconds
      const interval = setInterval(checkApprovalStatus, 10000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkApprovalStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('approval_status, role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setStatus(data.approval_status);
      setLoading(false);

      if (data.approval_status === 'approved') {
        // Redirect to appropriate dashboard
        router.push(`/${data.role}/dashboard`);
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const browseAsCustomer = () => {
    router.push('/customer/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 animate-fadeIn">
        {status === 'pending' && (
          <>
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Clock className="text-yellow-600" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-center mb-4">Approval Pending</h1>
            <p className="text-gray-600 text-center mb-6">
              Your {user?.role === 'merchant' ? 'restaurant' : 'driver'} account is under review. 
              You&apos;ll receive an email once approved by our admin team.
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 text-center">
                ⏱️ Average approval time: 24-48 hours
              </p>
            </div>

            {/* Browse as Customer Option */}
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 border-2 border-primary rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 text-center mb-3">
                Meanwhile, you can browse and order as a customer!
              </p>
              <button
                onClick={browseAsCustomer}
                className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <ShoppingBag size={20} />
                Browse as Customer
              </button>
            </div>
          </>
        )}

        {status === 'rejected' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-600" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-center mb-4">Application Rejected</h1>
            <p className="text-gray-600 text-center mb-6">
              Unfortunately, your application has been rejected. Please contact support for more information.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 text-center">
                📧 Email: support@pattibytes.com<br/>
                📞 Phone: +91 1234567890
              </p>
            </div>
          </>
        )}

        <button
          onClick={handleLogout}
          className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium flex items-center justify-center gap-2 transition-all"
        >
          <LogOut size={20} />
          Logout
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={checkApprovalStatus}
            disabled={loading}
            className="text-sm text-primary hover:underline"
          >
            🔄 Check Status Again
          </button>
        </div>
      </div>
    </div>
  );
}
