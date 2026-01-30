'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, Mail } from 'lucide-react';

interface RoleGateProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export default function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const { user, loading } = useAuth(); // ✅ Fixed: use 'user' instead of 'profile'
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      console.log('User:', user);
      console.log('Allowed Roles:', allowedRoles);
      console.log('User Role:', user.role);
      console.log('Approval Status:', user.approval_status);

      const hasRole = allowedRoles.includes(user.role);
      const isApproved = user.approval_status === 'approved';

      if (!hasRole) {
        console.log('User does not have required role');
        router.push('/unauthorized');
        return;
      }

      if (!isApproved) {
        console.log('User is not approved yet');
        return;
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthorized(true);
    }
  }, [user, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto text-primary mb-4" size={48} />
          <p className="text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-gray-600">No user profile found</p>
        </div>
      </div>
    );
  }

  if (user.approval_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Rejected</h1>
          <p className="text-gray-600 mb-6">
            Your account application was rejected. Please contact support.
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <strong>Email:</strong> {user.email}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Role:</strong> {user.role}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <a
              href="mailto:support@nestsweetbakers.com"
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
            >
              <Mail size={20} />
              Contact Support
            </a>
            <button
              onClick={() => router.push('/login')}
              className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user.approval_status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="text-yellow-600 animate-spin" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Pending Approval</h1>
          <p className="text-gray-600 mb-6">
            Your account is currently under review. You&lsquo;ll receive an email once approved.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Email:</strong> {user.email}<br />
              <strong>Role:</strong> {user.role}<br />
              <strong>Status:</strong> {user.approval_status}
            </p>
          </div>
          <button
            onClick={() => router.push('/login')}
            className="w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
