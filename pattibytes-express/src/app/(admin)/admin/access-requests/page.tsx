/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  AlertCircle,
  Shield,
  Crown,
  BadgeCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  approval_status: string | null;
  is_approved: boolean | null;
  is_active: boolean | null;
  profile_completed: boolean | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

interface AccessRequestRow {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  created_at: string;
  reviewed_at?: string | null;
}

interface AccessRequestUI extends AccessRequestRow {
  user_profile: {
    full_name: string;
    email: string;
    phone: string;
    role: string;
    approval_status: string;
    is_approved: boolean;
    is_active: boolean;
    profile_completed: boolean;
    address?: string;
    city?: string;
    state?: string;
  };
}

export default function AccessRequestsPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState<AccessRequestUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests]
  );

  useEffect(() => {
    loadRequests();

    const requestChannel = supabase
      .channel('access_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, () =>
        loadRequests()
      )
      .subscribe();

    const profileChannel = supabase
      .channel('profiles_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () =>
        loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestChannel);
      supabase.removeChannel(profileChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadRequests = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('access_requests')
        .select('id,user_id,requested_role,status,created_at,reviewed_at')
        .order('created_at', { ascending: false });

      if (filter !== 'all') query = query.eq('status', filter);

      const { data: requestsData, error: requestsError } = await query;
      if (requestsError) throw requestsError;

      if (!requestsData?.length) {
        setRequests([]);
        return;
      }

      const userIds = (requestsData as AccessRequestRow[]).map((r) => r.user_id);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(
          'id,full_name,email,phone,role,approval_status,is_approved,is_active,profile_completed,address,city,state'
        )
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const combined = (requestsData as AccessRequestRow[]).map((req) => {
        const p = (profilesData as ProfileRow[] | null)?.find((x) => x.id === req.user_id);

        return {
          ...req,
          user_profile: {
            full_name: p?.full_name || 'Unknown',
            email: p?.email || 'unknown@email.com',
            phone: p?.phone || 'N/A',
            role: p?.role || 'unknown',
            approval_status: p?.approval_status || 'pending',
            is_approved: Boolean(p?.is_approved),
            is_active: p?.is_active ?? true,
            profile_completed: Boolean(p?.profile_completed),
            address: p?.address || undefined,
            city: p?.city || undefined,
            state: p?.state || undefined,
          },
        };
      });

      setRequests(combined);
    } catch (error: any) {
      console.error('Failed to load access requests:', error);
      toast.error(error?.message || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setProcessingId(requestId);

      // Keep your RPC if you already created it; otherwise replace this with direct updates.
      const { error } = await supabase.rpc('process_access_request', {
        p_request_id: requestId,
        p_new_status: newStatus,
      });

      if (error) throw error;

      toast.success(newStatus === 'approved' ? '✅ Request approved' : '❌ Request rejected');
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to process request:', error);
      toast.error(error?.message || 'Failed to update request');
    } finally {
      setProcessingId(null);
    }
  };

  const revokeAccess = async (userId: string) => {
    const ok = confirm('Revoke access for this user? (Role will be reset to customer)');
    if (!ok) return;

    try {
      setProcessingId(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'customer',
          approval_status: 'revoked',
          is_approved: false,
          profile_completed: false,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('✅ Access revoked');
      await loadRequests();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to revoke access');
    } finally {
      setProcessingId(null);
    }
  };

  const grantFullAccess = async (userId: string, role: string) => {
    const ok = confirm(`Grant full access as "${role}"?`);
    if (!ok) return;

    try {
      setProcessingId(userId);

      const { error } = await supabase
        .from('profiles')
        .update({
          role,
          approval_status: 'approved',
          is_approved: true,
          profile_completed: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('✅ Access granted');
      await loadRequests();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to grant access');
    } finally {
      setProcessingId(null);
    }
  };

  const promote = async (userId: string, role: 'admin' | 'superadmin') => {
    if (role === 'superadmin' && user?.role !== 'superadmin') {
      toast.error('Only a superadmin can promote to superadmin');
      return;
    }

    const ok = confirm(`Promote this user to "${role}"?`);
    if (!ok) return;

    await grantFullAccess(userId, role);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Access Requests</h1>
          <p className="text-gray-600 mt-2">Approve, reject, revoke, or grant access.</p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 sm:px-6 py-3 font-medium capitalize whitespace-nowrap text-sm sm:text-base transition-colors ${
                  filter === status
                    ? 'text-primary border-b-2 border-primary bg-orange-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {status}
                {status === 'pending' && pendingCount > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
            <Clock className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">There are no {filter !== 'all' ? filter : ''} requests right now.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => {
              const busy = processingId === request.id || processingId === request.user_id;

              return (
                <div
                  key={request.id}
                  className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 border-l-4 ${
                    request.status === 'pending'
                      ? 'border-yellow-500'
                      : request.status === 'approved'
                      ? 'border-green-500'
                      : 'border-red-500'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between mb-4 gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                          request.requested_role === 'merchant'
                            ? 'bg-gradient-to-br from-orange-400 to-pink-500'
                            : 'bg-gradient-to-br from-blue-400 to-purple-500'
                        }`}
                      >
                        <User className="text-white" size={28} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 break-words">
                          {request.user_profile.full_name}
                        </h3>

                        <div className="flex flex-col gap-1 text-sm text-gray-600 mt-2">
                          <span className="flex items-center gap-2 break-all">
                            <Mail size={14} className="flex-shrink-0" />
                            {request.user_profile.email}
                          </span>
                          <span className="flex items-center gap-2">
                            <Phone size={14} className="flex-shrink-0" />
                            {request.user_profile.phone}
                          </span>
                          {(request.user_profile.city || request.user_profile.address) && (
                            <span className="flex items-center gap-2 text-xs">
                              <MapPin size={14} className="flex-shrink-0" />
                              {request.user_profile.city ? `${request.user_profile.city}, ` : ''}
                              {request.user_profile.state || ''}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            Current: <span className="capitalize">{request.user_profile.role}</span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              request.user_profile.is_approved
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {request.user_profile.is_approved ? '✓ Approved' : '✗ Not Approved'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                              request.user_profile.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {request.user_profile.is_active ? '● Active' : '○ Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right w-full sm:w-auto">
                      <span
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                            : request.status === 'approved'
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {request.status === 'pending' && <Clock size={16} />}
                        {request.status === 'approved' && <CheckCircle size={16} />}
                        {request.status === 'rejected' && <XCircle size={16} />}
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-primary/20 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="text-primary" size={24} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Requested access:</p>
                        <p className="text-lg font-bold text-primary capitalize">
                          {request.requested_role === 'merchant' ? '🏪 Restaurant Owner' : '🚗 Delivery Partner'} Panel
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {request.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleRequest(request.id, 'approved')}
                          disabled={busy}
                          className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                        >
                          {busy ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle size={20} />
                              Approve
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleRequest(request.id, 'rejected')}
                          disabled={busy}
                          className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                        >
                          {busy ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <XCircle size={20} />
                              Reject
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => grantFullAccess(request.user_id, request.requested_role)}
                          disabled={busy}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                        >
                          <BadgeCheck size={20} />
                          Grant full access
                        </button>

                        <button
                          onClick={() => revokeAccess(request.user_id)}
                          disabled={busy}
                          className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-6 py-3 rounded-lg hover:from-yellow-700 hover:to-yellow-800 font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                        >
                          <Shield size={20} />
                          Revoke
                        </button>

                        <button
                          onClick={() => promote(request.user_id, 'admin')}
                          disabled={busy}
                          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                        >
                          <Crown size={20} />
                          Promote admin
                        </button>

                        {user?.role === 'superadmin' ? (
                          <button
                            onClick={() => promote(request.user_id, 'superadmin')}
                            disabled={busy}
                            className="bg-gradient-to-r from-gray-900 to-black text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                          >
                            <Crown size={20} />
                            Promote superadmin
                          </button>
                        ) : (
                          <div className="hidden lg:block" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
