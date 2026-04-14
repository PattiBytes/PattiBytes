'use client';
import { Search, Filter, RefreshCw } from 'lucide-react';
import type { Role } from './types';

interface Props {
  searchQuery: string;
  roleFilter: 'all' | Role;
  loading: boolean;
  isSuperAdmin: boolean;
  onSearchChange: (v: string) => void;
  onRoleChange: (v: 'all' | Role) => void;
  onRefresh: () => void;
}

export default function UserFilters({
  searchQuery, roleFilter, loading, isSuperAdmin,
  onSearchChange, onRoleChange, onRefresh,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
      {/* Search */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        />
      </div>

      {/* Role filter */}
      <div className="flex items-center gap-2 shrink-0">
        <Filter size={16} className="text-gray-400" />
        <select
          value={roleFilter}
          onChange={(e) => onRoleChange(e.target.value as 'all' | Role)}
          className="px-3 py-2.5 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="merchant">Merchants</option>
          <option value="driver">Drivers</option>
          <option value="admin">Admins</option>
          {isSuperAdmin && <option value="superadmin">Super Admins</option>}
        </select>
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5
          rounded-lg bg-gray-900 text-white hover:bg-black transition-colors
          disabled:opacity-60 shrink-0 text-sm"
      >
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        Refresh
      </button>
    </div>
  );
}