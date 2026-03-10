 
'use client';
import { useState } from 'react';
import { X, Lock, UserPlus, Trash2, Bell, Share2, Copy } from 'lucide-react';
import { toast } from 'react-toastify';
import type { PromoCodeRow, CustomerLite } from '../_types';

interface Props {
  promo      : PromoCodeRow;
  customers  : CustomerLite[];
  saving     : boolean;
  onSave     (userIds: string[], notify: boolean, msg: string): void;
  onClose    (): void;
}

export function SecretManagerModal({ promo, customers, saving, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(promo.secret_allowed_users ?? []);
  const [search,   setSearch]   = useState('');
  const [notify,   setNotify]   = useState(true);
  const [msg,      setMsg]      = useState(promo.secret_note ?? '');

  const shareLink = typeof window !== 'undefined'
    ? `${window.location.origin}/promo/${promo.code.toLowerCase()}`
    : '';

  const filtered = search.length > 1
    ? customers.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : [];

  const addUser = (id: string) => {
    if (!selected.includes(id)) setSelected(p => [...p, id]);
    setSearch('');
  };

  const removeUser = (id: string) => setSelected(p => p.filter(x => x !== id));

  const selectedCustomers = customers.filter(c => selected.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white flex items-center gap-2"><Lock size={16}/> Secret Code Manager</h2>
            <p className="text-xs text-white/80 mt-0.5 font-mono">{promo.code}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Share link */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
            <p className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
              <Share2 size={10}/> Shareable Link
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-gray-700 flex-1 truncate bg-white px-2 py-1.5 rounded-lg border">{shareLink}</code>
              <button onClick={async () => { await navigator.clipboard.writeText(shareLink); toast.success('Link copied!'); }}
                className="p-1.5 rounded-lg bg-primary text-white hover:bg-orange-600">
                <Copy size={12}/>
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {selected.length === 0
                ? 'Anyone with this link can use the code.'
                : 'Only assigned users can use the code.'}
            </p>
          </div>

          {/* Assign users */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 flex items-center gap-1">
              <UserPlus size={10}/> Assign Specific Users (optional)
            </label>
            <div className="relative">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search customer name / phone…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400"/>
              {filtered.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-40 overflow-y-auto">
                  {filtered.map(c => (
                    <button key={c.id} type="button" onClick={() => addUser(c.id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50">
                      <p className="font-semibold">{c.full_name ?? '—'}</p>
                      <p className="text-gray-400">{c.phone} · {c.email}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected users */}
          {selectedCustomers.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedCustomers.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100 text-xs">
                  <div>
                    <span className="font-bold text-gray-800">{c.full_name ?? '—'}</span>
                    <span className="text-gray-500 ml-1.5">{c.phone}</span>
                  </div>
                  <button onClick={() => removeUser(c.id)}
                    className="p-1 rounded hover:bg-red-100 text-red-400">
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custom notification message */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notification Message</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2}
              placeholder={`You have exclusive access to use code ${promo.code}!`}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 resize-none"/>
          </div>

          {/* Notify toggle */}
          <label className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100 cursor-pointer">
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)}
              className="w-4 h-4 accent-primary"/>
            <div>
              <p className="text-xs font-bold text-blue-800 flex items-center gap-1"><Bell size={11}/> Notify users via push</p>
              <p className="text-xs text-blue-500">Sends notification to all assigned users immediately</p>
            </div>
          </label>

          <button onClick={() => onSave(selected, notify, msg)} disabled={saving}
            className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2">
            <Lock size={14}/> {saving ? 'Saving…' : 'Save & Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}
