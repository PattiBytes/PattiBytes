/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import {
  Search,
  Filter,
  Mail,
  Phone,
  Calendar,
  Pencil,
  Trash2,
  Shield,
  RefreshCw,
  X,
  Save,
  User as UserIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Role = 'customer' | 'merchant' | 'driver' | 'admin' | 'superadmin';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revoked' | string;

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;

  role: Role | string | null;
  approval_status: ApprovalStatus | null;

  is_approved: boolean | null;
  is_active: boolean | null;
  profile_completed: boolean | null;

  address?: string | null;
  city?: string | null;
  state?: string | null;

  created_at: string;
  updated_at?: string | null;

  // If you have more columns, add them here (or keep as any via spread).
  [key: string]: any;
}

const PER_PAGE = 20;

function roleBadge(role: string | null | undefined) {
  const r = (role || 'unknown').toLowerCase();
  const colors: Record<string, string> = {
    customer: 'bg-blue-100 text-blue-800',
    merchant: 'bg-orange-100 text-orange-800',
    driver: 'bg-green-100 text-green-800',
    admin: 'bg-purple-100 text-purple-800',
    superadmin: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800',
  };
  return colors[r] || 'bg-gray-100 text-gray-800';
}

export default function AdminUsersPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [count, setCount] = useState<number>(0);

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Small debounce so we don't hit DB every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleFilter, debouncedQuery, page]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (roleFilter !== 'all') query = query.eq('role', roleFilter);

      const q = debouncedQuery.trim();
      if (q) {
        // PostgREST "or" syntax: col.op.value,col.op.value
        query = query.or(
          `full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
        );
      }

      const from = (page - 1) * PER_PAGE;
      const to = from + PER_PAGE - 1;

      const { data, error, count: total } = await query.range(from, to);

      if (error) throw error;

      setRows((data as ProfileRow[]) || []);
      setCount(total || 0);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const list = rows;
    return {
      customers: list.filter((u) => u.role === 'customer').length,
      merchants: list.filter((u) => u.role === 'merchant').length,
      drivers: list.filter((u) => u.role === 'driver').length,
      admins: list.filter((u) => u.role === 'admin').length,
      total: count,
    };
  }, [rows, count]);

  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));

  const openEdit = (u: ProfileRow) => setEditing({ ...u });

  const saveEdit = async () => {
    if (!editing) return;

    try {
      setSaving(true);

      // Build update payload. Add/remove fields freely.
      const updatePayload: Partial<ProfileRow> = {
        full_name: editing.full_name,
        email: editing.email,
        phone: editing.phone,

        role: editing.role,
        approval_status: editing.approval_status,

        is_approved: editing.is_approved,
        is_active: editing.is_active,
        profile_completed: editing.profile_completed,

        address: editing.address,
        city: editing.city,
        state: editing.state,

        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', editing.id);

      if (error) throw error;

      toast.success('✅ User updated');
      setEditing(null);
      await loadUsers();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const softRevoke = async (profileId: string) => {
    try {
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
        .eq('id', profileId);

      if (error) throw error;

      toast.success('Access revoked');
      await loadUsers();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to revoke access');
    }
  };

  const deleteProfileRow = async (profileId: string) => {
    const ok = confirm(
      'Delete this profile row?\n\nNote: this does NOT delete the Supabase Auth user unless you do it server-side.'
    );
    if (!ok) return;

    try {
      setDeletingId(profileId);

      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;

      toast.success('✅ Profile row deleted');
      await loadUsers();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete profile row');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Users</h1>
            <p className="text-gray-600 mt-1">Search, edit, revoke, and manage users.</p>
          </div>

          <button
            onClick={loadUsers}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              value={searchQuery}
              onChange={(e) => {
                setPage(1);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search by name, email, phone..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value as any);
              }}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customers</option>
              <option value="merchant">Merchants</option>
              <option value="driver">Drivers</option>
              <option value="admin">Admins</option>
              {user?.role === 'superadmin' && <option value="superadmin">Super Admins</option>}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Customers</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{totals.customers}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 font-medium">Merchants</p>
            <p className="text-2xl font-bold text-orange-900 mt-1">{totals.merchants}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Drivers</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{totals.drivers}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Admins</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{totals.admins}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 font-medium">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totals.total}</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-28 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Search size={48} className="mx-auto text-gray-400 mb-3" />
            <h2 className="text-lg font-bold text-gray-900">No users found</h2>
            <p className="text-gray-600 mt-1">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {rows.map((u) => (
                <div key={u.id} className="bg-white rounded-xl border shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-white flex items-center justify-center font-bold">
                          {(u.full_name?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{u.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-600 truncate">{u.email || '—'}</p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-gray-700">
                        {u.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-gray-400" />
                            <span className="truncate">{u.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          <span className="truncate">
                            {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleBadge(u.role)}`}>
                          {u.role || 'unknown'}
                        </span>
                        {u.is_approved ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            Approved
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                            Not approved
                          </span>
                        )}
                        {u.is_active ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            Active
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white"
                      >
                        <Pencil size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => softRevoke(u.id)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-yellow-600 text-white"
                      >
                        <Shield size={16} />
                        Revoke
                      </button>
                      <button
                        onClick={() => deleteProfileRow(u.id)}
                        disabled={deletingId === u.id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                        {deletingId === u.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {rows.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                                {(u.full_name?.[0] || 'U').toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-4 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {u.full_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500 truncate">{u.id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Mail size={14} className="text-gray-400" />
                              <span className="truncate">{u.email || '—'}</span>
                            </div>
                            {u.phone && (
                              <div className="flex items-center gap-2">
                                <Phone size={14} className="text-gray-400" />
                                <span className="truncate">{u.phone}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleBadge(u.role)}`}>
                            {u.role || 'unknown'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar size={14} className="text-gray-400" />
                            <span>{formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
                            >
                              <Pencil size={16} />
                              Edit
                            </button>

                            <button
                              onClick={() => softRevoke(u.id)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-600 text-white hover:bg-yellow-700"
                            >
                              <Shield size={16} />
                              Revoke
                            </button>

                            <button
                              onClick={() => deleteProfileRow(u.id)}
                              disabled={deletingId === u.id}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              {deletingId === u.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5">
              <p className="text-sm text-gray-600">
                Page {page} of {totalPages} • {count} users
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setEditing(null)} />
            <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
              <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b">
                  <div className="flex items-center gap-2">
                    <UserIcon size={18} className="text-gray-500" />
                    <h2 className="text-lg font-bold text-gray-900">Edit user</h2>
                  </div>
                  <button
                    onClick={() => !saving && setEditing(null)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700">Full name</label>
                      <input
                        value={editing.full_name || ''}
                        onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Phone</label>
                      <input
                        value={editing.phone || ''}
                        onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">Email</label>
                      <input
                        value={editing.email || ''}
                        onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If you want email to be immutable, remove it from the update payload.
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Role</label>
                      <select
                        value={(editing.role || 'customer') as any}
                        onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      >
                        <option value="customer">customer</option>
                        <option value="merchant">merchant</option>
                        <option value="driver">driver</option>
                        <option value="admin">admin</option>
                        {user?.role === 'superadmin' && <option value="superadmin">superadmin</option>}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">Approval status</label>
                      <select
                        value={editing.approval_status || 'pending'}
                        onChange={(e) => setEditing({ ...editing, approval_status: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      >
                        <option value="pending">pending</option>
                        <option value="approved">approved</option>
                        <option value="rejected">rejected</option>
                        <option value="revoked">revoked</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(editing.is_approved)}
                          onChange={(e) => setEditing({ ...editing, is_approved: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Approved
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(editing.profile_completed)}
                          onChange={(e) =>
                            setEditing({ ...editing, profile_completed: e.target.checked })
                          }
                          className="w-4 h-4"
                        />
                        Profile completed
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editing.is_active ?? true}
                          onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                          className="w-4 h-4"
                        />
                        Active
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-sm font-semibold text-gray-700">Address</label>
                      <input
                        value={editing.address || ''}
                        onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">City</label>
                      <input
                        value={editing.city || ''}
                        onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700">State</label>
                      <input
                        value={editing.state || ''}
                        onChange={(e) => setEditing({ ...editing, state: e.target.value })}
                        className="mt-1 w-full px-4 py-3 border rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row gap-3 sm:justify-between">
                  <button
                    onClick={() => softRevoke(editing.id)}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-yellow-600 text-white disabled:opacity-50"
                  >
                    <Shield size={18} />
                    Revoke access
                  </button>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setEditing(null)}
                      disabled={saving}
                      className="px-4 py-3 rounded-lg border bg-white disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white disabled:opacity-50"
                    >
                      <Save size={18} />
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
