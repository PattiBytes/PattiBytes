/* eslint-disable @typescript-eslint/no-unused-vars */
 
'use client';
import { useState } from 'react';
import { X, Unlock } from 'lucide-react';
import type { MerchantOption, CustomerOption } from '../_types';

interface Props {
  merchants : MerchantOption[];
  customers : CustomerOption[];
  saving    : boolean;
  onGrant   (customerId: string, merchantId: string, note: string): void;
  onClose   (): void;
}

export function GrantAccessModal({ merchants, customers, saving, onGrant, onClose }: Props) {
  const [custSearch,  setCustSearch]  = useState('');
  const [customerId,  setCustomerId]  = useState('');
  const [merchantId,  setMerchantId]  = useState('');
  const [merchSearch, setMerchSearch] = useState('');
  const [note,        setNote]        = useState('');

  const filteredC = custSearch.length > 1
    ? customers.filter(c =>
        c.full_name?.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.phone?.includes(custSearch)
      ).slice(0, 6)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

        <div className="bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white flex items-center gap-2"><Unlock size={16}/> Grant Review Access</h2>
            <p className="text-xs text-white/70">Allow an offline customer to post a review</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">
            💡 Use this when a customer ordered <strong>offline or via phone</strong> and wants to leave a review.
            A stub review is created and the customer receives a notification to fill it in.
          </p>

          {/* Customer */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Customer</label>
            {customerId ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-blue-800">
                  {customers.find(c => c.id === customerId)?.full_name ?? 'Selected'}
                </span>
                <button type="button" onClick={() => { setCustomerId(''); setCustSearch(''); }}>
                  <X size={12} className="text-blue-400"/>
                </button>
              </div>
            ) : (
              <>
                <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
                  placeholder="Search name / phone…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400"
                />
                {filteredC.length > 0 && (
                  <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-40 overflow-y-auto">
                    {filteredC.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setCustomerId(c.id); setCustSearch(c.full_name ?? ''); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-violet-50">
                        <p className="font-semibold">{c.full_name ?? '—'}</p>
                        <p className="text-gray-400">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Merchant */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Merchant</label>
            <select value={merchantId} onChange={e => setMerchantId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400 bg-white">
              <option value="">— Select restaurant —</option>
              {merchants.map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}
            </select>
          </div>

          {/* Custom notification message */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notification Message (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              rows={2} placeholder="e.g. We'd love to hear about your recent visit!"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>

          <button
            onClick={() => customerId && merchantId && onGrant(customerId, merchantId, note)}
            disabled={!customerId || !merchantId || saving}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            <Unlock size={14}/> {saving ? 'Granting…' : 'Grant Access & Notify'}
          </button>
        </div>
      </div>
    </div>
  );
}


