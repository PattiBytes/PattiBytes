/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';

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
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    loadRequests();

    // Real-time subscription for access requests
    const requestChannel = supabase
      .channel('access_requests_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'access_requests' },
        (payload) => {
          console.log('Access request changed:', payload);
          loadRequests();
        }
      )
      .subscribe();

    // Real-time subscription for profile changes
    const profileChannel = supabase
      .channel('profiles_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Profile updated:', payload);
          loadRequests();
        }
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
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        return;
      }

      // Get user profiles with all required fields
      const userIds = requestsData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, role, approval_status, is_approved, is_active, profile_completed, address, city, state')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine requests with profiles
      const combinedData = requestsData.map(request => {
        const profile = profilesData?.find(p => p.id === request.user_id);
        return {
          ...request,
          user_profile: profile || {
            full_name: 'Unknown',
            email: 'unknown@email.com',
            phone: 'N/A',
            role: 'unknown',
            approval_status: 'pending',
            is_approved: false,
            is_active: true,
            profile_completed: false,
          }
        };
      });

      console.log('Loaded requests:', combinedData.length);
      setRequests(combinedData);
    } catch (error: any) {
      console.error('Failed to load access requests:', error);
      toast.error('Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (
    requestId: string, 
    userId: string, 
    newStatus: 'approved' | 'rejected', 
    requestedRole: string
  ) => {
    try {
      setProcessingId(requestId);

      console.log(`Processing ${newStatus} for user ${userId}, role: ${requestedRole}`);

      // Step 1: Update access request status
      const { error: requestError } = await supabase
        .from('access_requests')
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (requestError) {
        console.error('Error updating access request:', requestError);
        throw requestError;
      }

      // Step 2: Update profile with ALL required fields
      if (newStatus === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: requestedRole, // Change role to requested role (merchant/driver)
            approval_status: 'approved', // ✅ Set approval status
            is_approved: true, // ✅ Set is_approved to true
            profile_completed: true, // ✅ Mark profile as completed
            is_active: true, // ✅ Ensure account is active
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }

        // Send approval notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Account Approved! 🎉',
            message: `Congratulations! Your ${requestedRole} account has been approved. You can now access your ${requestedRole} dashboard.`,
            type: 'approval',
            is_read: false,
          });

        toast.success(`✅ ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)} account approved successfully!`);
        
        console.log(`Profile updated: role=${requestedRole}, approval_status=approved, is_approved=true, profile_completed=true`);

      } else {
        // Rejection: Update status but keep them as customer
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            role: 'customer', // ✅ Revert to customer role
            approval_status: 'rejected', // ✅ Set approval status to rejected
            is_approved: false, // ✅ Set is_approved to false
            profile_completed: false, // ✅ Mark as incomplete
            is_active: true, // ✅ Keep active so they can reapply
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw profileError;
        }

        // Send rejection notification
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            title: 'Account Application Rejected',
            message: `Your ${requestedRole} account application has been rejected. Please contact support@pattibytes.com for more information or to reapply.`,
            type: 'approval',
            is_read: false,
          });

        toast.success('❌ Access request rejected');
        
        console.log(`Profile updated: role=customer, approval_status=rejected, is_approved=false, profile_completed=false`);
      }

      // Reload requests to show updated data
      await loadRequests();

    } catch (error: any) {
      console.error('Failed to update request:', error);
      toast.error(error.message || 'Failed to update request. Please try again.');
    } finally {
      setProcessingId(null);
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
                className={`px-4 sm:px-6 py-3 font-medium capitalize whitespace-nowrap text-sm sm:text-base transition-colors ${
                  filter === status
                    ? 'text-primary border-b-2 border-primary bg-orange-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {status}
                {status === 'pending' && requests.filter(r => r.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full animate-pulse">
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 sm:p-12 text-center">
            <Clock className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              There are no {filter !== 'all' ? filter : ''} access requests at the moment.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
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
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                      request.requested_role === 'merchant' 
                        ? 'bg-gradient-to-br from-orange-400 to-pink-500' 
                        : 'bg-gradient-to-br from-blue-400 to-purple-500'
                    }`}>
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
                            {request.user_profile.city && `${request.user_profile.city}, `}
                            {request.user_profile.state}
                          </span>
                        )}
                      </div>

                      {/* Current Status Badges */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          Current: <span className="capitalize">{request.user_profile.role}</span>
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          request.user_profile.is_approved 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {request.user_profile.is_approved ? '✓ Approved' : '✗ Not Approved'}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          request.user_profile.is_active 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
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
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Requested Role Card */}
                <div className="bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-primary/20 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="text-primary" size={24} />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Requesting Access To:</p>
                      <p className="text-lg font-bold text-primary capitalize">
                        {request.requested_role === 'merchant' ? '🏪 Restaurant Owner' : '🚗 Delivery Partner'} Panel
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {request.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleRequest(request.id, request.user_id, 'approved', request.requested_role)}
                      disabled={processingId === request.id}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={20} />
                          Approve Request
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRequest(request.id, request.user_id, 'rejected', request.requested_role)}
                      disabled={processingId === request.id}
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === request.id ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle size={20} />
                          Reject Request
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Reviewed Status */}
                {request.status !== 'pending' && request.reviewed_at && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle size={16} className="text-gray-500" />
                    Reviewed on {new Date(request.reviewed_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
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
