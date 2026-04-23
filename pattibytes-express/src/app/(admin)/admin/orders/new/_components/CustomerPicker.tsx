'use client';
import { Search, Loader2, UserCheck, Link2, UserX } from 'lucide-react';
import type { CustomerMini, CustomerMode } from './types';

interface Props {
  customerMode: CustomerMode;
  setCustomerMode: (m: CustomerMode) => void;

  // existing
  customerQuery: string;
  setCustomerQuery: (v: string) => void;
  customerSearching: boolean;
  customerResults: CustomerMini[];
  customerId: string;
  setCustomerId: (id: string) => void;

  // walk-in
  walkinName: string;
  setWalkinName: (v: string) => void;
  walkinPhone: string;
  setWalkinPhone: (v: string) => void;
  phoneMatchResult: CustomerMini | null;
  phoneMatchLoading: boolean;
  linkedCustomerId: string | null;
  setLinkedCustomerId: (id: string | null) => void;
}

export function CustomerPicker({
  customerMode, setCustomerMode,
  customerQuery, setCustomerQuery, customerSearching, customerResults,
  customerId, setCustomerId,
  walkinName, setWalkinName, walkinPhone, setWalkinPhone,
  phoneMatchResult, phoneMatchLoading, linkedCustomerId, setLinkedCustomerId,
}: Props) {
  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-sm border border-blue-100 p-5 space-y-4">
      {/* Header + mode toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-white" />
          </span>
          Customer
        </h2>

        {/* Pill toggle */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {(['existing', 'walkin'] as CustomerMode[]).map(mode => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setCustomerMode(mode);
                if (mode === 'walkin') { setCustomerId(''); setCustomerQuery(''); }
                else                  { setWalkinName(''); setWalkinPhone(''); }
              }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                customerMode === mode
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'existing' ? '🔍 Existing' : '🚶 Walk-in'}
            </button>
          ))}
        </div>
      </div>

      {/* Existing customer search */}
      {customerMode === 'existing' ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
            <input
              value={customerQuery}
              onChange={e => setCustomerQuery(e.target.value)}
              placeholder="Search by name, phone, or email…"
              className="w-full pl-9 pr-10 py-3 rounded-xl border-2 border-gray-200
                         focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-sm"
            />
            {customerSearching && (
              <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-blue-400" />
            )}
          </div>

          {customerResults.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto rounded-xl border-2 border-blue-100 p-2 bg-white">
              {customerResults.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCustomerId(c.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    customerId === c.id
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'border-transparent hover:bg-blue-50 hover:border-blue-200'
                  }`}
                >
                  <p className="font-bold text-gray-900 text-sm">{c.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.phone || 'No phone'} · {c.email || 'No email'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

      ) : (
        /* Walk-in fields */
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={walkinName}
              onChange={e => setWalkinName(e.target.value)}
              placeholder="Customer name"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                         focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-sm"
            />
            <div className="relative">
              <input
                value={walkinPhone}
                onChange={e => setWalkinPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Phone (10 digits)"
                inputMode="numeric"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                           focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white text-sm"
              />
              {phoneMatchLoading && (
                <Loader2 className="absolute right-3 top-3.5 w-4 h-4 animate-spin text-blue-400" />
              )}
            </div>
          </div>

          {/* Phone match banner */}
          {phoneMatchResult && !phoneMatchLoading && (
            <div className={`rounded-xl border-2 p-3 flex items-start gap-3 transition-all ${
              linkedCustomerId === phoneMatchResult.id
                ? 'bg-blue-50 border-blue-400'
                : 'bg-amber-50 border-amber-300'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">
                  Existing account found!
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {phoneMatchResult.full_name} · {phoneMatchResult.email || 'No email'}
                </p>
              </div>
              {linkedCustomerId === phoneMatchResult.id ? (
                <button
                  type="button"
                  onClick={() => setLinkedCustomerId(null)}
                  className="flex items-center gap-1 text-xs font-bold text-red-500
                             hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                >
                  <UserX className="w-3.5 h-3.5" /> Unlink
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setLinkedCustomerId(phoneMatchResult.id)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600
                             hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" /> Link
                </button>
              )}
            </div>
          )}

          {linkedCustomerId && (
            <p className="text-xs text-green-700 font-semibold bg-green-50 px-3 py-2 rounded-xl border border-green-200">
              ✅ Order will be linked to account ID: {linkedCustomerId.slice(0, 8)}…
            </p>
          )}
        </div>
      )}
    </div>
  );
}


