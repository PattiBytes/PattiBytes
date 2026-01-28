/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Clock, Mail, Phone } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  user_email?: string;
  user_name?: string;
  user_phone?: string;
}

export default function AccessRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadRequests();
     
  }, [user]);

  const loadRequests = async () => {
    try {
      // First get access requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('access_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Then get user details for each request
      const enrichedRequests = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: userData } = await supabase
            .from('profiles')
            .select('full_name, email, phone')
            .eq('id', request.user_id)
            .single();

          return {
            ...request,
            user_name: userData?.full_name || 'Unknown',
            user_email: userData?.email || '',
            user_phone: userData?.phone || '',
          };
        })
      );

      setRequests(enrichedRequests as AccessRequest[]);
    } catch (error: any) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, userId: string, role: string) => {
    try {
      // Update user role
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update request status
      const { error: requestError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If merchant role, create merchant profile
      if (role === 'merchant') {
        const { data: userData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const { error: merchantError } = await supabase
          .from('merchants')
          .insert([
            {
              owner_id: userId,
              user_id: userId,
              business_name: userData?.full_name + "'s Restaurant",
              email: userData?.email,
              phone: userData?.phone || '',
              address: {},
              is_active: true,
              is_verified: true,
            },
          ]);

        if (merchantError) console.error('Merchant creation error:', merchantError);
      }

      toast.success('Access request approved!');
      loadRequests();
    } catch (error: any) {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Access request rejected');
      loadRequests();
    } catch (error: any) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'merchant') return '🏪';
    if (role === 'driver') return '🚗';
    return '👤';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Access Requests</h1>
            <p className="text-gray-600 mt-1">Review and approve user role requests</p>
          </div>
          {requests.length > 0 && (
            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-lg font-semibold">
              {requests.length} Pending
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Clock size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No pending requests</h2>
            <p className="text-gray-600">All access requests have been reviewed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="text-4xl">{getRoleIcon(request.requested_role)}</div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">
                        {request.user_name || 'Unknown User'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Requesting access to{' '}
                        <span className="font-semibold capitalize">{request.requested_role}</span> panel
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={16} />
                          <span>{request.user_email}</span>
                        </div>
                        {request.user_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={16} />
                            <span>{request.user_phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={12} />
                        <span>
                          Requested{' '}
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() =>
                        handleApprove(request.id, request.user_id, request.requested_role)
                      }
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium flex items-center gap-2"
                    >
                      <CheckCircle size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium flex items-center gap-2"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
