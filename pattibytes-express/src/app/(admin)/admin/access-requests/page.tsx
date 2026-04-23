// src/app/(admin)/admin/access-requests/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Clock } from 'lucide-react';
import { toast } from 'react-toastify';

import type {
  AccessRequestUI, FilterStatus, FilterTypeValue, AccessRequestNotifPrefs,
} from './_components/types';
import { DEFAULT_NOTIF_PREFS } from './_components/types';
import RequestFilters          from './_components/RequestFilters';
import RequestCard             from './_components/RequestCard';
import NotificationSettingsModal from './_components/NotificationSettingsModal';
import UserDetailModal         from './_components/UserDetailModal';

// ─── Profile fields we actually need ─────────────────────────────────────────
const PROFILE_SELECT = [
  'id','full_name','email','phone','role','approval_status','is_approved','is_active',
  'profile_completed','address','city','state','pincode','username','account_status',
  'total_orders','completed_orders','cancelled_orders','cancelled_orders_count',
  'trust_score','is_trusted','last_order_date','created_at',
  'ban_reason','banned_at','banned_by','ban_expires_at',
].join(',');

// ─── Notification sound helper ────────────────────────────────────────────────
function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext not available
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AccessRequestsPage() {
  const { user } = useAuth();

  // Data
  const [requests, setRequests]     = useState<AccessRequestUI[]>([]);
  const [loading, setLoading]       = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [filter, setFilter]         = useState<FilterStatus>('pending');
  const [typeFilter, setTypeFilter] = useState<FilterTypeValue>('all');

  // Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<AccessRequestUI | null>(null);

  // Notification prefs (loaded from app_settings.admin_preferences)
  const [notifPrefs, setNotifPrefs] = useState<AccessRequestNotifPrefs>(DEFAULT_NOTIF_PREFS);
  const prevCountRef = useRef(0);

  // ── Load notification prefs from app_settings ───────────────────────────────
  useEffect(() => {
    supabase
      .from('app_settings')
      .select('admin_preferences')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const saved = (data?.admin_preferences as any)?.access_request_notifications;
        if (saved) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...saved });
      });
  }, []);

  // ── Load requests ────────────────────────────────────────────────────────────
  const loadRequests = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('access_requests')
        .select('id,user_id,requested_role,request_type,status,notes,reviewed_by,reviewed_at,created_at,scheduled_deletion_at,cancellation_reason')
        .order('created_at', { ascending: false });

      if (filter !== 'all')     query = query.eq('status', filter);
      if (typeFilter !== 'all') query = query.eq('request_type', typeFilter);

      const { data: reqData, error: reqErr } = await query;
      if (reqErr) throw reqErr;
      if (!reqData?.length) { setRequests([]); return; }

      const userIds = reqData.map((r: any) => r.user_id);

      const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select(PROFILE_SELECT)
        .in('id', userIds);

      if (profErr) throw profErr;

      const combined: AccessRequestUI[] = reqData.map((req: any) => {
        const p = (profiles ?? []).find((x: any) => x.id === req.user_id) as any;
        return {
          ...req,
          request_type: req.request_type || 'role_upgrade',   // backfill old rows
          user_profile: {
            id:                   p?.id                   ?? req.user_id,
            full_name:            p?.full_name            || 'Unknown',
            email:                p?.email                || '—',
            phone:                p?.phone                || '—',
            role:                 p?.role                 || 'customer',
            approval_status:      p?.approval_status      || 'pending',
            is_approved:          Boolean(p?.is_approved),
            is_active:            p?.is_active            ?? true,
            profile_completed:    Boolean(p?.profile_completed),
            account_status:       p?.account_status       || 'active',
            address:              p?.address              || null,
            city:                 p?.city                 || null,
            state:                p?.state                || null,
            pincode:              p?.pincode              || null,
            username:             p?.username             || null,
            total_orders:         p?.total_orders         ?? null,
            completed_orders:     p?.completed_orders     ?? null,
            cancelled_orders:     p?.cancelled_orders     ?? null,
            cancelled_orders_count: p?.cancelled_orders_count ?? null,
            trust_score:          p?.trust_score          ?? null,
            is_trusted:           p?.is_trusted           ?? false,
            last_order_date:      p?.last_order_date      || null,
            created_at:           p?.created_at           || null,
            ban_reason:           p?.ban_reason           || null,
            banned_at:            p?.banned_at            || null,
            banned_by:            p?.banned_by            || null,
            ban_expires_at:       p?.ban_expires_at       || null,
          },
        };
      });

      // ── Sound / toast on NEW pending requests ─────────────────────────────
      if (notifPrefs.enabled) {
        const newPending = combined.filter((r) => r.status === 'pending').length;
        if (newPending > prevCountRef.current && prevCountRef.current !== 0) {
          const diff = newPending - prevCountRef.current;
          // Check type-specific pref
          const newest = combined
            .filter((r) => r.status === 'pending')
            .slice(0, diff);
          newest.forEach((r) => {
            const typeOk =
              (r.request_type === 'role_upgrade'     && notifPrefs.role_upgrade) ||
              (r.request_type === 'account_deletion' && notifPrefs.account_deletion) ||
              (r.request_type === 'panel_request'    && notifPrefs.panel_request) ||
              true;
            if (typeOk) {
              toast.info(`🔔 New ${r.request_type.replace('_', ' ')} request from ${r.user_profile.full_name}`);
              if (notifPrefs.sound) playNotifSound();
            }
          });
        }
        prevCountRef.current = newPending;
      }

      setRequests(combined);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  // ── Realtime subscriptions ───────────────────────────────────────────────────
  useEffect(() => {
    loadRequests();

    const ch1 = supabase
      .channel('access_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_requests' }, loadRequests)
      .subscribe();

    const ch2 = supabase
      .channel('profiles_changes_access')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, loadRequests)
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, typeFilter]);

  // ── Counts ───────────────────────────────────────────────────────────────────
  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  // ── Role Upgrade handlers ────────────────────────────────────────────────────
  const handleRequest = async (requestId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setProcessingId(requestId);
      const { error } = await supabase.rpc('process_access_request', {
        p_request_id: requestId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      toast.success(newStatus === 'approved' ? '✅ Request approved' : '❌ Request rejected');
      await loadRequests();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error: any) {
      // Fallback to direct update if RPC doesn't exist
      try {
        const { error: e2 } = await supabase
          .from('access_requests')
          .update({ status: newStatus, reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
          .eq('id', requestId);
        if (e2) throw e2;
        toast.success(newStatus === 'approved' ? '✅ Request approved' : '❌ Request rejected');
        await loadRequests();
      } catch (e3: any) {
        toast.error(e3?.message || 'Failed to update request');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const revokeAccess = async (userId: string) => {
    if (!confirm('Revoke access? Role will be reset to customer.')) return;
    try {
      setProcessingId(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'customer', approval_status: 'revoked', is_approved: false, profile_completed: false, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      toast.success('✅ Access revoked');
      await loadRequests();
    } catch (e: any) { toast.error(e?.message || 'Failed to revoke'); } finally { setProcessingId(null); }
  };

  const grantFullAccess = async (userId: string, role: string) => {
    if (!confirm(`Grant full access as "${role}"?`)) return;
    try {
      setProcessingId(userId);
      const { error } = await supabase
        .from('profiles')
        .update({ role, approval_status: 'approved', is_approved: true, profile_completed: true, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      toast.success('✅ Full access granted');
      await loadRequests();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setProcessingId(null); }
  };

  const promote = async (userId: string, role: 'admin' | 'superadmin') => {
    if (role === 'superadmin' && user?.role !== 'superadmin') {
      toast.error('Only a superadmin can promote to superadmin'); return;
    }
    if (!confirm(`Promote this user to "${role}"?`)) return;
    await grantFullAccess(userId, role);
  };

  // ── Account Deletion handlers ────────────────────────────────────────────────
  const handleApproveDeletion = async (requestId: string, userId: string) => {
    if (!confirm('Approve this account deletion request? The account will be scheduled for deletion in 30 days.')) return;
    try {
      setProcessingId(requestId);
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('profiles').update({ account_status: 'deletion_scheduled', is_active: false, updated_at: new Date().toISOString() }).eq('id', userId),
        supabase.from('access_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id, scheduled_deletion_at: deletionDate.toISOString() }).eq('id', requestId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      toast.success('✅ Deletion approved — scheduled for 30 days');
      await loadRequests();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setProcessingId(null); }
  };

  const handleRejectDeletion = async (requestId: string, userId: string) => {
    if (!confirm("Reject this deletion request? The user's account will be restored.")) return;
    try {
      setProcessingId(requestId);
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('profiles').update({ account_status: 'active', is_active: true, updated_at: new Date().toISOString() }).eq('id', userId),
        supabase.from('access_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', requestId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      toast.success('✅ Deletion request rejected — account restored');
      await loadRequests();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setProcessingId(null); }
  };

  const handleCancelDeletion = async (requestId: string, userId: string) => {
    if (!confirm('Cancel scheduled deletion and restore this account?')) return;
    try {
      setProcessingId(requestId);
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('profiles').update({ account_status: 'active', is_active: true, updated_at: new Date().toISOString() }).eq('id', userId),
        supabase.from('access_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id, scheduled_deletion_at: null }).eq('id', requestId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      toast.success('✅ Deletion cancelled — account fully restored');
      await loadRequests();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setProcessingId(null); }
  };

  const handlePermanentDelete = async (userId: string, requestId: string) => {
    const confirm1 = confirm('⚠️ PERMANENT DELETE — This cannot be undone. Are you absolutely sure?');
    if (!confirm1) return;
    const confirm2 = confirm(`Type "DELETE" mentally and confirm: Permanently delete user ${userId}?`);
    if (!confirm2) return;
    try {
      setProcessingId(requestId);
      // Mark profile as deleted (actual auth user deletion should go via Edge Function in production)
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from('profiles').update({ account_status: 'deleted', is_active: false, is_approved: false, role: 'customer', updated_at: new Date().toISOString() }).eq('id', userId),
        supabase.from('access_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', requestId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      toast.success('✅ Account marked as deleted');
      await loadRequests();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setProcessingId(null); }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Access Requests</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Manage role upgrades, account deletion requests, and panel access.
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {pendingCount} pending
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filters */}
        <RequestFilters
          filter={filter}
          typeFilter={typeFilter}
          requests={requests}
          onFilterChange={setFilter}
          onTypeFilterChange={setTypeFilter}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-primary mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading requests…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <Clock className="mx-auto text-gray-300 mb-4" size={56} />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No requests found</h3>
            <p className="text-gray-400 text-sm">
              No {filter !== 'all' ? filter : ''} {typeFilter !== 'all' ? typeFilter.replace('_', ' ') : ''} requests right now.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                busy={processingId === request.id || processingId === request.user_id}
                currentUserRole={user?.role}
                onApprove={(id) => handleRequest(id, 'approved')}
                onReject={(id) => handleRequest(id, 'rejected')}
                onGrantAccess={grantFullAccess}
                onRevoke={revokeAccess}
                onPromote={promote}
                onApproveDeletion={handleApproveDeletion}
                onRejectDeletion={handleRejectDeletion}
                onCancelDeletion={handleCancelDeletion}
                onPermanentDelete={handlePermanentDelete}
                onViewDetails={setDetailRequest}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NotificationSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        prefs={notifPrefs}
        onPrefsChange={setNotifPrefs}
      />
      <UserDetailModal
        request={detailRequest}
        onClose={() => setDetailRequest(null)}
      />
    </DashboardLayout>
  );
}

