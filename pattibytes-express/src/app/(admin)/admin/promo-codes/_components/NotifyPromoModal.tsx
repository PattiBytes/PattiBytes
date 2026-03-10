'use client';
import { useState } from 'react';
import { X, Bell, Send, Users, Globe, Store } from 'lucide-react';
import type { PromoCodeRow, MerchantLite } from '../_types';

interface Props {
  promo    : PromoCodeRow;
  merchants: MerchantLite[];
  onSend   (msg: string): void;
  onClose  (): void;
}

export function NotifyPromoModal({ promo, merchants, onSend, onClose }: Props) {
  const mName    = merchants.find(m => m.id === promo.merchant_id)?.business_name;
  const isGlobal = promo.scope === 'global';
  const isSecret = promo.is_secret;

  const defaultMsg = isSecret
    ? `You have exclusive access to use code "${promo.code}"!`
    : isGlobal
      ? `🎉 New offer: use code "${promo.code}" to save!`
      : `${mName ?? 'We'} has a special offer! Use "${promo.code}" on your next order.`;

  const [message, setMessage] = useState(defaultMsg);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2"><Bell size={16}/> Send Notification</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white">
            <X size={14}/>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Target audience */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Sending to</p>
            <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-lg ${
              isSecret ? 'bg-amber-50 text-amber-700' : isGlobal ? 'bg-green-50 text-green-700' : 'bg-purple-50 text-purple-700'
            }`}>
              {isSecret ? <><Users size={14}/> Secret — {(promo.secret_allowed_users ?? []).length || 'All'} users</> : null}
              {!isSecret && isGlobal  ? <><Globe size={14}/> All active customers</> : null}
              {!isSecret && !isGlobal ? <><Store size={14}/> Past customers of {mName ?? 'merchant'}</> : null}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 resize-none"/>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose}
              className="py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => { onSend(message); onClose(); }}
              className="py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2">
              <Send size={13}/> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
