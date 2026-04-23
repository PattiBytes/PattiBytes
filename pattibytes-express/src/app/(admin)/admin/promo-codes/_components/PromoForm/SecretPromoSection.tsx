'use client';
import { useState } from 'react';
import { Lock, X, UserPlus } from 'lucide-react';
import type { PromoFormState, CustomerLite } from '../../_types';

interface Props {
  form      : PromoFormState;
  customers : CustomerLite[];
  update    (patch: Partial<PromoFormState>): void;
}

export function SecretPromoSection({ form, customers, update }: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.length > 1
    ? customers.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      ).slice(0, 6)
    : [];

  const addUser = (id: string) => {
    if (!form.secret_allowed_users.includes(id))
      update({ secret_allowed_users: [...form.secret_allowed_users, id] });
    setSearch('');
  };

  const removeUser = (id: string) =>
    update({ secret_allowed_users: form.secret_allowed_users.filter(x => x !== id) });

  const selectedCustomers = customers.filter(c => form.secret_allowed_users.includes(c.id));

  return (
    <div className={`border-2 rounded-xl p-4 space-y-3 transition-all ${
      form.is_secret ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'
    }`}>
      {/* Toggle */}
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <div className="flex items-center gap-2">
          <Lock size={14} className={form.is_secret ? 'text-amber-600' : 'text-gray-400'}/>
          <div>
            <p className="text-sm font-bold text-gray-800">Secret / Private Code</p>
            <p className="text-xs text-gray-500">Not visible in public offer listings. Share manually or assign to users.</p>
          </div>
        </div>
        <div
          onClick={() => update({ is_secret: !form.is_secret })}
          className={`relative w-11 h-6 rounded-full cursor-pointer transition-all flex-shrink-0 ${
            form.is_secret ? 'bg-amber-500' : 'bg-gray-300'
          }`}>
          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            form.is_secret ? 'translate-x-5' : 'translate-x-0.5'
          }`}/>
        </div>
      </label>

      {form.is_secret && (
        <>
          {/* Secret note */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Admin Note (internal, not shown to users)</label>
            <input value={form.secret_note} onChange={e => update({ secret_note: e.target.value })}
              placeholder="e.g. VIP offer for Rahul — birthday discount"
              className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white"/>
          </div>

          {/* User restriction */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
              <UserPlus size={10}/> Restrict to Specific Users (optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Leave empty → anyone with the code can use it. Add users → only they can redeem it.
            </p>

            <div className="relative">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customer by name / phone…"
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-400 bg-white"/>
              {filtered.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-36 overflow-y-auto">
                  {filtered.map(c => (
                    <button key={c.id} type="button" onClick={() => addUser(c.id)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-amber-50">
                      <span className="font-semibold">{c.full_name ?? '—'}</span>
                      <span className="text-gray-400 ml-1">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedCustomers.map(c => (
                  <span key={c.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                    {c.full_name ?? c.phone ?? c.id.slice(0,8)}
                    <button type="button" onClick={() => removeUser(c.id)} className="hover:text-red-600">
                      <X size={10}/>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


