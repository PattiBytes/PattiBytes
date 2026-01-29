'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Clock, User, Mail, Phone } from 'lucide-react';
import { toast } from 'react-toastify';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: string;
  approval_status: string;
  created_at: string;
}

export default function AccessRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, phone, role, approval_status, created_at')
        .in('role', ['merchant', 'driver']);

      if (filter !== 'all') {
        query = query.eq('approval_status', filter);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as Profile[]);
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User approved successfully!');
      loadRequests();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to approve:', error);
      toast.error(error.message || 'Failed to approve user');
    }
  };

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this request?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Request rejected');
      loadRequests();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to reject:', error);
      toast.error(error.message || 'Failed to reject request');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Access Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve merchant & driver applications</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`flex-1 px-6 py-4 font-medium whitespace-nowrap ${
                  filter === status
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-white" size={24} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 truncate">
                        {request.full_name || 'Unnamed User'}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail size={16} className="flex-shrink-0" />
                          <span className="truncate">{request.email}</span>
                        </div>
                        {request.phone && (
                          <div className="flex items-center gap-1">
                            <Phone size={16} className="flex-shrink-0" />
                            <span>{request.phone}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                          {request.role === 'merchant' ? '🏪 Merchant' : '🚗 Driver'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(request.created_at).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2">
                    {request.approval_status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={18} />
                          <span className="hidden sm:inline">Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 sm:flex-initial px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2"
                        >
                          <XCircle size={18} />
                          <span className="hidden sm:inline">Reject</span>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                          request.approval_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.approval_status === 'approved' ? (
                          <>
                            <CheckCircle size={18} />
                            Approved
                          </>
                        ) : (
                          <>
                            <XCircle size={18} />
                            Rejected
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <Clock size={64} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {filter === 'pending' ? 'No pending approval requests' : 'No requests in this category'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
