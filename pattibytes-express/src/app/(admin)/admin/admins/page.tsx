/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Plus, Shield, RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import type { AdminProfile } from './_components/types';
import { BRANCHES } from './_components/types';
import AdminCard from './_components/AdminCard';
import AddAdminModal from './_components/AddAdminModal';
import EditAdminModal from './_components/EditAdminModal';

export default function ManageAdminsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState<string>('all');

  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (isSuperAdmin) loadAdmins();
  }, [isSuperAdmin]);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,phone,role,avatar_url,approval_status,is_active,city,state,username,created_at,updated_at')
        .in('role', ['admin', 'superadmin'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins((data as AdminProfile[]) || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (adminId: string) => {
    if (adminId === user?.id) {
      toast.error('You cannot remove yourself');
      return;
    }
    if (!confirm('Remove admin access for this user? They will become a regular customer.')) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'customer', updated_at: new Date().toISOString() })
        .eq('id', adminId);
      if (error) throw error;
      toast.success('Admin removed');
      loadAdmins();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove');
    }
  };

  // ── Branch filters ───────────────────────────────────────────────
  const filteredAdmins = branchFilter === 'all'
    ? admins
    : admins.filter((a) => {
        if (branchFilter === 'global') return !a.city && !a.username;
        return (a.city?.toLowerCase().includes(branchFilter.toLowerCase())) ||
               a.username === branchFilter;
      });

  const branchCounts = BRANCHES.map((b) => ({
    ...b,
    count: admins.filter((a) =>
      b.code === 'global'
        ? !a.city && !a.username
        : a.city?.toLowerCase() === b.city.toLowerCase() || a.username === b.code
    ).length,
  })).filter((b) => b.count > 0 || b.code === 'global');

  if (!isSuperAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Shield size={64} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only Super Admins can manage admin users</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Admins</h1>
            <p className="text-gray-600 text-sm mt-1">
              {admins.length} admin{admins.length !== 1 ? 's' : ''} across all branches
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAdmins}
              disabled={loading}
              className="p-2.5 rounded-xl border bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold text-sm"
            >
              <Plus size={16} /> Add Admin
            </button>
          </div>
        </div>

        {/* Branch filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button
            onClick={() => setBranchFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
              ${branchFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All ({admins.length})
          </button>
          {branchCounts.map((b) => (
            <button
              key={b.code}
              onClick={() => setBranchFilter(b.code)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors
                ${branchFilter === b.code ? 'bg-primary text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
            >
              <MapPin size={10} />
              {b.label} ({b.count})
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-36 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <Shield size={56} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">No admins found</h2>
            <p className="text-gray-500 text-sm">
              {branchFilter !== 'all' ? 'No admins assigned to this branch yet.' : 'Add your first admin.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdmins.map((admin) => (
              <AdminCard
                key={admin.id}
                admin={admin}
                currentUserId={user!.id}
                isSuperAdmin={isSuperAdmin}
                onEdit={(a) => setEditTarget({ ...a })}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showAdd && (
          <AddAdminModal
            currentUserId={user!.id}
            isSuperAdmin={isSuperAdmin}
            onClose={() => setShowAdd(false)}
            onCreated={loadAdmins}
          />
        )}
        {editTarget && (
          <EditAdminModal
            admin={editTarget}
            isSuperAdmin={isSuperAdmin}
            onClose={() => setEditTarget(null)}
            onSaved={loadAdmins}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

