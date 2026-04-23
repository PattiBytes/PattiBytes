/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/services/notifications';
import { toast } from 'react-toastify';
import {
  X, Bell, Send, Users, User as UserIcon,
  CheckCircle, AlertCircle, Megaphone,
} from 'lucide-react';
import type { UserWithMerchant } from './types';

type TargetMode = 'single' | 'role' | 'all';
type NotifType = 'system' | 'promo' | 'order_update' | 'announcement';

interface Props {
  singleUser?: UserWithMerchant;   // if opened from a specific user row
  onClose: () => void;
}

interface SendResult {
  total: number;
  succeeded: number;
  failed: number;
}

// Send Expo push notification directly (no server needed — Expo push is public)
async function sendExpoPush(token: string, title: string, body: string, data?: any) {
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) return false;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {}, sound: 'default', priority: 'high' }),
    });
    const json = await res.json();
    return json?.data?.status === 'ok' || res.ok;
  } catch {
    return false;
  }
}

const TYPE_OPTIONS: { value: NotifType; label: string; emoji: string }[] = [
  { value: 'system',       label: 'System Alert',      emoji: '🔔' },
  { value: 'promo',        label: 'Promotion',         emoji: '🎉' },
  { value: 'order_update', label: 'Order Update',      emoji: '📦' },
  { value: 'announcement', label: 'Announcement',      emoji: '📢' },
];

export default function PushNotificationModal({ singleUser, onClose }: Props) {
  const [mode, setMode]     = useState<TargetMode>(singleUser ? 'single' : 'role');
  const [roleTarget, setRoleTarget] = useState<string>('customer');
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [type, setType]     = useState<NotifType>('system');
  const [url, setUrl]       = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const targetLabel = mode === 'single'
    ? singleUser?.full_name || singleUser?.email || 'User'
    : mode === 'all'
    ? 'All users'
    : `All ${roleTarget}s`;

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body are required');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      let targets: { id: string; expo_push_token: string | null; push_token: string | null }[] = [];

      if (mode === 'single' && singleUser) {
        // Fetch fresh push tokens
        const { data } = await supabase
          .from('profiles')
          .select('id,expo_push_token,push_token')
          .eq('id', singleUser.id)
          .single();
        if (data) targets = [data];
      } else {
        let q = supabase
          .from('profiles')
          .select('id,expo_push_token,push_token')
          .eq('is_active', true);

        if (mode === 'role') q = q.eq('role', roleTarget);
        const { data } = await q;
        targets = data || [];
      }

      let succeeded = 0;
      let failed = 0;
      const notifData: any = { type, url: url.trim() || undefined };

      // Process in batches of 50
      const BATCH = 50;
      for (let i = 0; i < targets.length; i += BATCH) {
        const batch = targets.slice(i, i + BATCH);

        await Promise.all(
          batch.map(async (t) => {
            try {
              // 1 — save to DB
              await sendNotification(t.id, title.trim(), body.trim(), type, notifData);

              // 2 — push if token exists
              const token = t.expo_push_token || t.push_token;
              if (token) {
                await sendExpoPush(token, title.trim(), body.trim(), notifData);
              }

              succeeded++;
            } catch {
              failed++;
            }
          })
        );
      }

      setResult({ total: targets.length, succeeded, failed });
      if (failed === 0) {
        toast.success(`✅ Sent to ${succeeded} user${succeeded !== 1 ? 's' : ''}`);
      } else {
        toast.warning(`Sent ${succeeded}/${targets.length} — ${failed} failed`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={() => !sending && onClose()} />
      <div className="absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-indigo-50">
            <div className="flex items-center gap-2">
              <Megaphone size={17} className="text-indigo-600" />
              <h2 className="font-bold text-gray-900">Push Notification</h2>
            </div>
            <button onClick={() => !sending && onClose()} className="p-2 rounded-lg hover:bg-indigo-100">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Result banner */}
            {result && (
              <div className={`flex items-start gap-3 p-3 rounded-xl border text-sm
                ${result.failed === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {result.failed === 0 ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                <div>
                  <p className="font-semibold">
                    {result.failed === 0 ? `Sent to all ${result.succeeded} user(s)` : `Partial: ${result.succeeded}/${result.total} succeeded`}
                  </p>
                  {result.failed > 0 && <p className="text-xs mt-0.5">{result.failed} failed (no push token or DB error)</p>}
                </div>
              </div>
            )}

            {/* Target mode */}
            {!singleUser && (
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Recipients</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['single', 'Pick user', UserIcon],
                      ['role',   'By role',   Users],
                      ['all',    'Everyone',  Bell],
                    ] as [TargetMode, string, any][]
                  ).map(([m, label, Icon]) => (
                    <button
                      key={m} type="button"
                      onClick={() => setMode(m)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-semibold flex flex-col items-center gap-1 transition-all
                        ${mode === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <Icon size={15} />
                      {label}
                    </button>
                  ))}
                </div>

                {mode === 'role' && (
                  <select
                    value={roleTarget}
                    onChange={(e) => setRoleTarget(e.target.value)}
                    className="mt-3 w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
                  >
                    {['customer', 'merchant', 'driver', 'admin', 'superadmin'].map((r) => (
                      <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}s</option>
                    ))}
                  </select>
                )}

                {mode === 'all' && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    This will send to ALL active users — use with caution.
                  </div>
                )}
              </section>
            )}

            {/* Recipient preview */}
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 text-sm">
              <Bell size={14} className="text-gray-400 shrink-0" />
              <span className="text-gray-600">Sending to: <strong className="text-gray-900">{targetLabel}</strong></span>
            </div>

            {/* Type */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Type</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.value} type="button"
                    onClick={() => setType(t.value)}
                    className={`p-2.5 rounded-xl border-2 text-xs font-semibold flex items-center gap-2 transition-all
                      ${type === t.value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <span>{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Content */}
            <section>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Content</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Title *</label>
                  <input
                    type="text" value={title} maxLength={80}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Special offer just for you! 🎉"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
                  />
                  <p className="text-right text-xs text-gray-400 mt-0.5">{title.length}/80</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Message *</label>
                  <textarea
                    value={body} maxLength={200} rows={3}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Enter your notification message…"
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                  <p className="text-right text-xs text-gray-400 mt-0.5">{body.length}/200</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Deep Link URL (optional)</label>
                  <input
                    type="text" value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. /customer/orders or https://pbexpress.pattibytes.com/..."
                    className="w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            </section>

            {/* Preview */}
            {(title || body) && (
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Preview</p>
                <div className="bg-gray-900 rounded-2xl p-4 text-white">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                      <Bell size={14} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{title || 'Notification Title'}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{body || 'Your message preview…'}</p>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex gap-3 justify-end bg-gray-50">
            <button
              onClick={onClose} disabled={sending}
              className="px-4 py-2.5 rounded-xl border bg-white text-sm disabled:opacity-50"
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm disabled:opacity-50"
            >
              {sending
                ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sending…</>
                : <><Send size={14} /> Send Notification</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
