'use client';

import React from 'react';
import { Search, Filter } from 'lucide-react';

interface Props {
  search:         string;
  onSearch:       (v: string) => void;
  statusFilter:   string;
  onStatusFilter: (v: string) => void;
  statuses:       string[];
  placeholder?:   string;
}

export function OrderFilters({
  search, onSearch, statusFilter, onStatusFilter, statuses, placeholder,
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-3 mb-4 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder={placeholder ?? 'Search...'}
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <select
            value={statusFilter}
            onChange={e => onStatusFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-primary focus:border-transparent appearance-none"
          >
            <option value="all">All Statuses</option>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
