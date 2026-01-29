/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Clock, User, Mail, Phone } from 'lucide-react';
import { toast } from 'react-toastify';
import { logger } from '@/lib/logger';

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  user_profile: {
    full_name: string;
    email: string;
    phone: string;
    role: string;
  };
}

export default function AccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();

    // Real-time subscription
    const channel = supabase
      .channel('access_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'access_requests' },
        () => {
          console.log('Access request changed, reloading...');
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      // First get access requests
      let query = supabase
        .from('access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) {
        logger.error('Error loading requests', requestsError);
        throw requestsError;
      }

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get user profiles separately
      const userIds = requestsData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role')
        .in('id', userIds);

      if (profilesError) {
        logger.error('Error loading profiles', profilesError);
        throw profilesError;
      }

      // Combine requests with profiles
      const combinedData = requestsData.map(request => {
        const profile = profilesData?.find(p => p.id === request.user_id);
        return {
          ...request,
          user_profile: profile || {
            full_name: 'Unknown',
            email: 'unknown@email.com',
            phone: 'N/A',
            role: 'unknown'
          }
        };
      });

      console.log('Loaded requests:', combinedData.length);
      setRequests(combinedData);
    } catch (error: any) {
      logger.error('Failed to load access requests', error);
      toast.error('Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, userId: string, newStatus: 'approved' | 'rejected', requestedRole: string) => {
    try {
      // Update access request status
      const { error: requestError } = await supabase
        .from('access_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) {
        logger.error('Error updating request', requestError);
        throw requestError;
      }

      // If approved, update user's role and approval status
      if (newStatus === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: requestedRole,
            approval_status: 'approved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          logger.error('Error updating profile', profileError);
          throw profileError;
        }

        toast.success(`Access request approved! User can now access ${requestedRole} panel.`);
      } else {
        // Update profile to rejected status
        await supabase
          .from('profiles')
          .update({
            approval_status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        toast.success('Access request rejected');
      }

      loadRequests();
    } catch (error: any) {
      logger.error('Failed to update request', error);
      toast.error(error.message || 'Failed to update request');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Access Requests</h1>
          <p className="text-gray-600 mt-2">Review and manage access requests from users</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 sm:px-6 py-3 font-medium capitalize whitespace-nowrap text-sm sm:text-base ${
                  filter === status
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {status}
                {status === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                    {requests.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary mx-auto"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">There are no {filter !== 'all' ? filter : ''} access requests at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="text-primary" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 break-words">
                        {request.user_profile.full_name}
                      </h3>
                      <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1 break-all">
                          <Mail size={14} className="flex-shrink-0" />
                          {request.user_profile.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={14} className="flex-shrink-0" />
                          {request.user_profile.phone}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Current role: </span>
                        <span className="text-sm font-semibold text-gray-900 capitalize">
                          {request.user_profile.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right w-full sm:w-auto">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                        request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {request.status === 'pending' && <Clock size={16} />}
                      {request.status === 'approved' && <CheckCircle size={16} />}
                      {request.status === 'rejected' && <XCircle size={16} />}
                      {request.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Requested access to:</span>{' '}
                    <span className="capitalize font-bold text-primary">{request.requested_role} Panel</span>
                  </p>
                </div>

                {request.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleRequest(request.id, request.user_id, 'approved', request.requested_role)}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, request.user_id, 'rejected', request.requested_role)}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
                    >
                      <XCircle size={20} />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
