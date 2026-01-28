/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Clock, User, Mail, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';

interface AccessRequest {
  id: string;
  user_id: string;
  requested_role: string;
  status: string;
  notes?: string;
  created_at: string;
  reviewed_at?: string;
  profiles: {
    full_name: string;
    email: string;
    phone?: string;
  };
}

export default function AdminAccessRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    if (user) loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filter]);

  const loadRequests = async () => {
    try {
      let query = supabase
        .from('access_requests')
        .select(`
          *,
          profiles!access_requests_user_id_fkey (
            full_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRequests(data as any);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, userId: string, role: string) => {
    try {
      // Update user role
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (roleError) throw roleError;

      // Update request status
      const { error: requestError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Send notification to user
      await supabase.from('notifications').insert([
        {
          user_id: userId,
          title: 'Access Request Approved',
          body: `Your request for ${role} panel access has been approved!`,
          type: 'access_approved',
          data: { role },
        },
      ]);

      toast.success('Access request approved!');
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve request');
    }
  };

  const handleReject = async (requestId: string, userId: string, role: string) => {
    if (!confirm('Are you sure you want to reject this request?')) return;

    try {
      const { error } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          reviewed_by: user!.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to user
      await supabase.from('notifications').insert([
        {
          user_id: userId,
          title: 'Access Request Rejected',
          body: `Your request for ${role} panel access has been rejected.`,
          type: 'access_rejected',
          data: { role },
        },
      ]);

      toast.success('Access request rejected');
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject request');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      merchant: 'text-orange-600',
      driver: 'text-blue-600',
      admin: 'text-purple-600',
    };
    return colors[role] || 'text-gray-600';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Access Requests</h1>
            <p className="text-gray-600 mt-1">Review and approve panel access requests</p>
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  {requests.filter((r) => r.status === 'pending').length}
                </p>
              </div>
              <Clock className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {requests.filter((r) => r.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-red-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {requests.filter((r) => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <Clock size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No requests found</h2>
            <p className="text-gray-600">Access requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="text-gray-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{request.profiles.full_name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Mail size={14} />
                        <span>{request.profiles.email}</span>
                      </div>
                      {request.profiles.phone && (
                        <p className="text-sm text-gray-600 mt-1">{request.profiles.phone}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Requested Role</p>
                      <p className={`text-lg font-bold capitalize ${getRoleColor(request.requested_role)}`}>
                        {request.requested_role} Panel
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Request Date</p>
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar size={14} />
                        <span>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>

                  {request.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700">{request.notes}</p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(request.id, request.user_id, request.requested_role)}
                        className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id, request.user_id, request.requested_role)}
                        className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                    </div>
                  )}

                  {request.reviewed_at && (
                    <div className="text-sm text-gray-600 mt-3">
                      Reviewed {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
