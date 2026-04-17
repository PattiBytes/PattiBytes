/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { Search, Bell } from 'lucide-react';

import type { Role, UserWithMerchant } from './_components/types';
import { PER_PAGE } from './_components/types';
import { useUsersData } from './_components/hooks/useUsersData';
import { useRoleCounts } from './_components/hooks/useRoleCounts';
import { useOrderAnalytics } from './_components/hooks/useOrderAnalytics';
import PushNotificationModal from './_components/PushNotificationModal';

import UserStatsCards   from './_components/UserStatsCards';
import UserFilters      from './_components/UserFilters';
import UserTableDesktop from './_components/UserTableDesktop';
import UserCardsMobile  from './_components/UserCardsMobile';
import UserEditModal    from './_components/UserEditModal';
import PermissionsModal from './_components/PermissionsModal';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  // ── Filters ──────────────────────────────────────────────────────────
  const [page, setPage]               = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter]   = useState<'all' | Role>('all');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── Data ─────────────────────────────────────────────────────────────
  const { loading, rows, count, loadUsers } = useUsersData(
    user?.id, roleFilter, debouncedQuery, page
  );
  const roleCounts    = useRoleCounts(user?.id);
  const { analytics } = useOrderAnalytics(user?.id);

  // ── Edit ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<UserWithMerchant | null>(null);
  const [saving, setSaving]   = useState(false);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name:         editing.full_name,
          email:             editing.email,
          phone:             editing.phone,
          role:              editing.role,
          approval_status:   editing.approval_status,
          is_approved:       editing.is_approved,
          is_active:         editing.is_active,
          profile_completed: editing.profile_completed,
          is_trusted:        editing.is_trusted,
          address:           editing.address,
          city:              editing.city,
          state:             editing.state,
          updated_at:        new Date().toISOString(),
        })
        .eq('id', editing.id);
      if (error) throw error;
      toast.success('✅ User updated');
      setEditing(null);
      await loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  // ── Revoke ───────────────────────────────────────────────────────────
  const softRevoke = async (profileId: string) => {
    try {
      const { error } = await supabase.from('profiles').update({
        role:              'customer',
        approval_status:   'revoked',
        is_approved:       false,
        profile_completed: false,
        is_active:         true,
        updated_at:        new Date().toISOString(),
      }).eq('id', profileId);
      if (error) throw error;
      toast.success('Access revoked');
      if (editing?.id === profileId) setEditing(null);
      await loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to revoke');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteProfileRow = async (profileId: string) => {
    if (!confirm('Delete this profile row?\n\nNote: Auth user is NOT deleted.')) return;
    try {
      setDeletingId(profileId);
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;
      toast.success('✅ Profile deleted');
      await loadUsers();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Permissions modal ────────────────────────────────────────────────
  const [permTarget, setPermTarget] = useState<UserWithMerchant | null>(null);

  // ── Push notification modal ──────────────────────────────────────────
  // null = closed | 'bulk' = bulk sender | UserWithMerchant = single user
  const [pushTarget, setPushTarget] = useState<UserWithMerchant | 'bulk' | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));

  const handleSearchChange = (v: string) => { setPage(1); setSearchQuery(v); };
  const handleRoleChange   = (v: 'all' | Role) => { setPage(1); setRoleFilter(v); };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div
        className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 overflow-x-hidden"
        style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}
      >
        {/* Page title + Bulk Notify button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Users</h1>
            <p className="text-gray-600 mt-1 text-sm">
              Search, edit, manage permissions, and analyse users.
            </p>
          </div>

          <button
            onClick={() => setPushTarget('bulk')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600
              hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shrink-0"
          >
            <Bell size={15} />
            Bulk Notify
          </button>
        </div>

        {/* Analytics + role stats */}
        <UserStatsCards
          roleCounts={roleCounts}
          analytics={analytics}
          filteredTotal={count}
        />

        {/* Filters + refresh */}
        <UserFilters
          searchQuery={searchQuery}
          roleFilter={roleFilter}
          loading={loading}
          isSuperAdmin={isSuperAdmin}
          onSearchChange={handleSearchChange}
          onRoleChange={handleRoleChange}
          onRefresh={loadUsers}
        />

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-28 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <Search size={48} className="mx-auto text-gray-400 mb-3" />
            <h2 className="text-lg font-bold text-gray-900">No users found</h2>
            <p className="text-gray-600 mt-1 text-sm">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <UserCardsMobile
              rows={rows}
              deletingId={deletingId}
              onEdit={(u) => setEditing({ ...u })}
              onRevoke={(id) => softRevoke(id)}
              onDelete={deleteProfileRow}
              onPermissions={(u) => setPermTarget({ ...u })}
              onNotify={(u) => setPushTarget({ ...u })}
            />

            {/* Desktop table */}
            <UserTableDesktop
              rows={rows}
              deletingId={deletingId}
              onEdit={(u) => setEditing({ ...u })}
              onRevoke={(id) => softRevoke(id)}
              onDelete={deleteProfileRow}
              onPermissions={(u) => setPermTarget({ ...u })}
              onNotify={(u) => setPushTarget({ ...u })}
            />

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages} &bull; {count} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50 text-sm"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50 text-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Edit modal ── */}
        {editing && (
          <UserEditModal
            editing={editing}
            saving={saving}
            isSuperAdmin={isSuperAdmin}
            onChange={(patch) => setEditing((e) => e ? { ...e, ...patch } : e)}
            onSave={saveEdit}
            onRevoke={() => { softRevoke(editing.id); }}
            onClose={() => !saving && setEditing(null)}
          />
        )}

        {/* ── Permissions modal ── */}
        {permTarget && user && (
          <PermissionsModal
            target={permTarget}
            adminId={user.id}
            onClose={() => setPermTarget(null)}
            onSaved={loadUsers}
          />
        )}

        {/* ── Push notification modal ── */}
        {pushTarget !== null && (
          <PushNotificationModal
            singleUser={pushTarget === 'bulk' ? undefined : pushTarget}
            onClose={() => setPushTarget(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}