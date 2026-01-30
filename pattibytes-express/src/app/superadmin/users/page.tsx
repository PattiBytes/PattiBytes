'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { CheckCircle, XCircle, Search } from 'lucide-react';
import { toast } from 'react-toastify';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  approval_status: string;
  is_approved: boolean;
  created_at: string;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'approved',
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('User approved');
      loadUsers();
    } catch (error) {
      console.error('Failed to approve user:', error);
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this user?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approval_status: 'rejected',
          is_approved: false,
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('User rejected');
      loadUsers();
    } catch (error) {
      console.error('Failed to reject user:', error);
      toast.error('Failed to reject user');
    }
  };

  const filteredUsers = users
    .filter(user => {
      if (filter === 'pending') return user.approval_status === 'pending';
      if (filter === 'approved') return user.approval_status === 'approved';
      if (filter === 'rejected') return user.approval_status === 'rejected';
      return true;
    })
    .filter(user =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Management</h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              All ({users.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'pending' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Pending ({users.filter(u => u.approval_status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'approved' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              Approved ({users.filter(u => u.approval_status === 'approved').length})
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{user.full_name || 'N/A'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm capitalize font-medium text-gray-700">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(user.approval_status)}`}>
                        {user.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.approval_status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => approveUser(user.id)}
                            className="bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 text-sm font-medium flex items-center gap-1"
                          >
                            <CheckCircle size={16} />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectUser(user.id)}
                            className="bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 text-sm font-medium flex items-center gap-1"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
