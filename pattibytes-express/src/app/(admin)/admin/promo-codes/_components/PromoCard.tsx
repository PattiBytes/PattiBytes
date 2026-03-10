'use client';
import { useState } from 'react';
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Tag, Copy, Edit2, Trash2, Bell, Lock, Gift, BadgePercent,
  Zap, ChevronDown, ChevronUp, Users, ExternalLink,
} from 'lucide-react';
import type { PromoCodeRow } from '../_types';

interface Props {
  promo       : PromoCodeRow;
  merchantName: string;
  onEdit      (): void;
  onDelete    (): void;
  onToggle    (): void;
  onNotify    (): void;
  onCopy      (code: string): void;
  onSecretMgr (): void;
}

function Pill({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}>{children}</span>;
}

function fmt(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' });
}

const DAY_LABELS = ['','Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function PromoCard({ promo: p, merchantName, onEdit, onDelete, onToggle, onNotify, onCopy, onSecretMgr }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isBxgy  = p.deal_type === 'bxgy';
  const isExpired = p.valid_until ? new Date(p.valid_until) < new Date() : false;

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden
      border-l-4 ${p.is_active && !isExpired ? 'border-l-green-400' : 'border-l-gray-300'}
      ${isExpired ? 'opacity-70' : ''}`}>

      {/* Main row */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isBxgy ? <Gift size={15} className="text-purple-600 flex-shrink-0"/> : <Tag size={15} className="text-primary flex-shrink-0"/>}
            <span className="font-bold text-gray-900 font-mono tracking-wide">{p.code}</span>

            <button onClick={() => onCopy(p.code)}
              className="text-gray-400 hover:text-primary transition-colors" title="Copy code">
              <Copy size={12}/>
            </button>

            <Pill cls={p.is_active && !isExpired ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
              {isExpired ? 'Expired' : p.is_active ? 'Active' : 'Inactive'}
            </Pill>
            <Pill cls={isBxgy ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
              {isBxgy ? 'BXGY' : 'Discount'}
            </Pill>
            {p.is_secret   && <Pill cls="bg-amber-100 text-amber-700"><Lock size={10} className="inline mr-0.5"/>Secret</Pill>}
            {p.auto_apply  && <Pill cls="bg-orange-100 text-orange-700"><Zap size={10} className="inline mr-0.5"/>Auto</Pill>}
            {p.scope === 'global' ? <Pill cls="bg-gray-100 text-gray-600">Global</Pill>
              : <Pill cls="bg-indigo-100 text-indigo-700">{merchantName || 'Merchant'}</Pill>}
          </div>

          {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{p.description}</p>}

          <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-600">
            <span className="font-semibold">
              {isBxgy
                ? `Buy ${p.deal_json?.buy?.qty ?? '?'} Get ${p.deal_json?.get?.qty ?? '?'} ${p.deal_json?.get?.discount?.type === 'free' ? 'FREE' : ''}`
                : p.discount_type === 'percentage' ? `${p.discount_value}% OFF` : `₹${p.discount_value} OFF`}
            </span>
            {p.min_order_amount ? <span>Min ₹{p.min_order_amount}</span> : null}
            <span>Expires {fmt(p.valid_until)}</span>
            <span className="text-gray-400">Used {p.used_count ?? 0}{p.usage_limit ? `/${p.usage_limit}` : ''}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button onClick={onNotify}
              className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
              title="Send notification">
              <Bell size={11}/>
            </button>
            {p.is_secret && (
              <button onClick={onSecretMgr}
                className="p-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                title="Manage secret users">
                <Users size={11}/>
              </button>
            )}
            <button onClick={onEdit}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-primary hover:text-white hover:border-primary transition-all"
              title="Edit">
              <Edit2 size={11}/>
            </button>
            <button onClick={onDelete}
              className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-600 hover:text-white transition-all"
              title="Delete">
              <Trash2 size={11}/>
            </button>
            <button onClick={() => setExpanded(x => !x)}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-100 transition-all">
              {expanded ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
            </button>
          </div>

          <button onClick={onToggle}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              p.is_active
                ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}>
            {p.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-2 text-xs animate-fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Scope',       value: p.scope },
              { label: 'Max/User',    value: p.max_uses_per_user ?? '∞' },
              { label: 'Max Disc.',   value: p.max_discount_amount ? `₹${p.max_discount_amount}` : '—' },
              { label: 'Priority',    value: p.priority ?? 0 },
              { label: 'Valid From',  value: fmt(p.valid_from) },
              { label: 'Valid Until', value: fmt(p.valid_until) },
              { label: 'Start Time',  value: p.start_time ? String(p.start_time).slice(0,5) : '—' },
              { label: 'End Time',    value: p.end_time   ? String(p.end_time).slice(0,5) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-lg p-2 border border-gray-100">
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {(p.valid_days ?? []).length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-gray-500 font-semibold">Valid days:</span>
              {(p.valid_days ?? []).map(n => (
                <span key={n} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-bold">
                  {DAY_LABELS[n]}
                </span>
              ))}
            </div>
          )}

          {p.is_secret && (
            <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
              <p className="font-bold text-amber-700 flex items-center gap-1">
                <Lock size={10}/> Secret Code
              </p>
              <p className="text-amber-600 mt-0.5">
                {(p.secret_allowed_users ?? []).length === 0
                  ? 'Shareable with anyone (no restriction)'
                  : `Restricted to ${p.secret_allowed_users!.length} user(s)`}
              </p>
              {p.secret_note && <p className="text-gray-500 italic mt-0.5">{p.secret_note}</p>}
            </div>
          )}

          {isBxgy && p.deal_json && (
            <div className="bg-purple-50 rounded-lg p-2 border border-purple-100">
              <p className="font-bold text-purple-700">BXGY Config</p>
              <p className="text-purple-600">
                Buy {p.deal_json.buy?.qty ?? '?'} → Get {p.deal_json.get?.qty ?? '?'} (
                {p.deal_json.get?.discount?.type === 'free' ? 'FREE'
                  : p.deal_json.get?.discount?.type === 'percentage'
                    ? `${p.deal_json.get.discount.value}% off`
                    : `₹${p.deal_json.get?.discount?.value} off`}
                ) · Max {p.deal_json.max_sets_per_order ?? 1} sets
              </p>
              <p className="text-purple-500 mt-0.5">
                Selection: {p.deal_json.selection === 'auto_cheapest' ? 'Auto (cheapest)' : 'Customer choice'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 text-gray-400 flex-wrap pt-1">
            <code className="font-mono">{p.id.slice(0,12)}…</code>
            {p.created_at && <span>Created {fmt(p.created_at)}</span>}
            <a href={`/admin/orders?promo=${p.id}`}
              className="flex items-center gap-0.5 text-primary hover:underline">
              <ExternalLink size={9}/> View orders
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
