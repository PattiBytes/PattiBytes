/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Clock, User, Mail, Phone } from 'lucide-react';
import { toast } from 'react-toastify';

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  profiles: {
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
      let query = supabase
        .from('access_requests')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            phone,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
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

      if (requestError) throw requestError;

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

        if (profileError) throw profileError;

        // Send notification (you can implement this later)
        toast.success(`Access request ${newStatus}! User can now access ${requestedRole} panel.`);
      } else {
        toast.success(`Access request ${newStatus}`);
      }

      loadRequests();
    } catch (error: any) {
      console.error('Error updating request:', error);
      toast.error(error.message || 'Failed to update request');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Access Requests</h1>
          <p className="text-gray-600 mt-2">Review and manage access requests from users</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-6 py-3 font-medium capitalize whitespace-nowrap ${
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
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">There are no {filter !== 'all' ? filter : ''} access requests at the moment.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="text-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {request.profiles.full_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {request.profiles.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {request.profiles.phone}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm text-gray-600">Current role: </span>
                        <span className="text-sm font-semibold text-gray-900 capitalize">
                          {request.profiles.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
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
                  <div className="flex gap-3">
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
