// src/app/(admin)/admin/access-requests/_components/RequestFilters.tsx
'use client';

import { Settings } from 'lucide-react';
import type { FilterStatus, FilterTypeValue, AccessRequestUI } from './types';

interface Props {
  filter: FilterStatus;
  typeFilter: FilterTypeValue;
  requests: AccessRequestUI[];
  onFilterChange: (f: FilterStatus) => void;
  onTypeFilterChange: (f: FilterTypeValue) => void;
  onOpenSettings: () => void;
}

const STATUS_TABS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const TYPE_TABS: { value: FilterTypeValue; label: string; emoji: string }[] = [
  { value: 'all', label: 'All Types', emoji: '📋' },
  { value: 'role_upgrade', label: 'Role Upgrades', emoji: '🔑' },
  { value: 'account_deletion', label: 'Account Deletions', emoji: '🗑️' },
  { value: 'panel_request', label: 'Panel Requests', emoji: '🖥️' },
];

export default function RequestFilters({
  filter,
  typeFilter,
  requests,
  onFilterChange,
  onTypeFilterChange,
  onOpenSettings,
}: Props) {
  const countByStatus = (s: FilterStatus) =>
    s === 'all' ? requests.length : requests.filter((r) => r.status === s).length;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="bg-white rounded-xl shadow mb-6">
      {/* Status row + settings */}
      <div className="flex items-center border-b overflow-x-auto">
        <div className="flex flex-1">
          {STATUS_TABS.map((tab) => {
            const count = countByStatus(tab.value);
            const isPending = tab.value === 'pending' && pendingCount > 0;
            return (
              <button
                key={tab.value}
                onClick={() => onFilterChange(tab.value)}
                className={`px-4 sm:px-6 py-3 font-medium capitalize whitespace-nowrap text-sm transition-colors flex items-center gap-2 ${
                  filter === tab.value
                    ? 'text-primary border-b-2 border-primary bg-orange-50'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    filter === tab.value
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600'
                  } ${isPending ? 'animate-pulse' : ''}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Settings gear */}
        <button
          onClick={onOpenSettings}
          className="p-3 mx-2 rounded-lg text-gray-500 hover:text-primary hover:bg-orange-50 transition-colors flex-shrink-0"
          title="Notification settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Type filter row */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap mr-1">
          Type:
        </span>
        {TYPE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => onTypeFilterChange(t.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1 transition-colors border ${
              typeFilter === t.value
                ? 'bg-primary text-white border-primary'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary/50 hover:text-primary'
            }`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

