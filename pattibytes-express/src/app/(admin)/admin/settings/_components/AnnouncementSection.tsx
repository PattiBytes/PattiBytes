'use client';
import Image from 'next/image';
import {
  MessageSquare, Link as LinkIcon, Calendar, KeyRound,
  PanelTop, Upload, Image as ImageIcon, Loader2,
  Bell, BellRing, Users, Send, CheckCircle2, AlertTriangle,
  Smartphone, Globe
} from 'lucide-react';
import type { Settings } from './types';
import { Toggle } from './Toggle';
import { defaultAnnouncement, toDatetimeLocal, toIsoOrEmpty, uploadToCloudinary } from './utils';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';

interface Props {
  settings: Settings;
  onChange: (s: Settings) => void;
  onSave?: () => Promise<void>;
}

/* ── Push target options ── */
type PushTarget = 'all' | 'customers' | 'merchants' | 'drivers';

const TARGET_LABELS: Record<PushTarget, string> = {
  all:       'All Users',
  customers: 'Customers only',
  merchants: 'Merchants only',
  drivers:   'Drivers only',
};

export function AnnouncementSection({ settings, onChange, onSave }: Props) {
  const [uploading,       setUploading]       = useState(false);
  const [sending,         setSending]         = useState(false);
  const [pushTarget,      setPushTarget]      = useState<PushTarget>('all');
  const [pushSent,        setPushSent]        = useState<number | null>(null);
  const [customTitle,     setCustomTitle]     = useState('');
  const [customMessage,   setCustomMessage]   = useState('');
  const [useAnnContent,   setUseAnnContent]   = useState(true);

  const ann = settings.announcement ?? defaultAnnouncement();
  const set = (patch: Partial<typeof ann>) =>
    onChange({ ...settings, announcement: { ...ann, ...patch } });

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      set({ image_url: url });
      toast.success('Image uploaded!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  /* ── Broadcast push notifications ── */
  const handleBroadcastPush = async () => {
    const title   = useAnnContent ? ann.title   : customTitle.trim();
    const message = useAnnContent ? ann.message : customMessage.trim();

    if (!title || !message) {
      toast.error('Title and message are required before broadcasting');
      return;
    }

    setSending(true);
    setPushSent(null);

    try {
      // 1. First save the announcement settings
      if (onSave) await onSave();

      // 2. Fetch target user IDs from profiles table
       
      let query = supabase.from('profiles').select('id, role');
      if (pushTarget !== 'all') {
        query = query.eq('role', pushTarget === 'customers' ? 'customer' : pushTarget === 'merchants' ? 'merchant' : 'driver');
      }
      const { data: users, error: userErr } = await query;
      if (userErr) throw userErr;
      if (!users || users.length === 0) {
        toast.warn('No users found for selected target');
        return;
      }

      // 3. Batch-insert into notifications table
      const notifPayload = users.map((u: { id: string }) => ({
        user_id:   u.id,
        title:     `📢 ${title}`,
        body:      message,
        message:   message,
        type:      'announcement',
        is_read:   false,
        sent_push: false,
        data: {
          type:     'announcement',
          link_url: ann.link_url ?? '',
          ann_type: ann.type,
        },
      }));

      // Insert in batches of 100 to avoid payload limits
      const BATCH = 100;
      let inserted = 0;
      for (let i = 0; i < notifPayload.length; i += BATCH) {
        const batch = notifPayload.slice(i, i + BATCH);
        const { error: insertErr } = await supabase.from('notifications').insert(batch);
        if (insertErr) throw insertErr;
        inserted += batch.length;
      }

      // 4. Trigger web push via Supabase Edge Function (if configured)
      try {
        await supabase.functions.invoke('send-web-push', {
          body: {
            title,
            message,
            link_url: ann.link_url ?? '',
            target:   pushTarget,
            image_url: ann.image_url ?? '',
          },
        });
      } catch {
        // Web push is optional — don't fail the whole operation
        console.warn('Web push edge function not available, skipping');
      }

      setPushSent(inserted);
      toast.success(`📣 Broadcast sent to ${inserted} user${inserted !== 1 ? 's' : ''}!`);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Broadcast failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Toggle row ── */}
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
        <Toggle checked={ann.enabled} onChange={v => set({ enabled: v })} label="Enabled" />
        <div className="flex items-center gap-2">
          <PanelTop size={15} className="text-gray-500" />
          <select
            value={ann.type}
            onChange={e => set({ type: e.target.value as 'banner' | 'popup' })}
            className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold focus:ring-2 focus:ring-primary"
          >
            <option value="banner">Top Banner</option>
            <option value="popup">Popup Modal</option>
          </select>
        </div>
        <Toggle checked={ann.dismissible} onChange={v => set({ dismissible: v })} label="Dismissible" />
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${ann.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
          {ann.enabled ? '● Live' : '○ Off'}
        </span>
      </div>

      {/* ── Fields ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
          <input
            value={ann.title}
            onChange={e => set({ title: e.target.value })}
            placeholder="e.g. Free delivery today!"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <KeyRound size={14} /> Dismiss Key
          </label>
          <div className="flex gap-2">
            <input
              value={ann.dismiss_key}
              onChange={e => set({ dismiss_key: e.target.value })}
              placeholder="v1"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all"
            />
            <button
              type="button"
              onClick={() => set({ dismiss_key: `v${Date.now()}` })}
              className="px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-700 transition hover:scale-105"
            >
              New
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
          <MessageSquare size={14} /> Message
        </label>
        <textarea
          value={ann.message}
          onChange={e => set({ message: e.target.value })}
          rows={3}
          placeholder="Short, clear message for customers"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary resize-none transition-all"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <LinkIcon size={14} /> Link (optional)
          </label>
          <input
            value={ann.link_url ?? ''}
            onChange={e => set({ link_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
            <Calendar size={14} /> Active Window
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="datetime-local"
              value={toDatetimeLocal(ann.start_at)}
              onChange={e => set({ start_at: toIsoOrEmpty(e.target.value) })}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary transition-all"
            />
            <input
              type="datetime-local"
              value={toDatetimeLocal(ann.end_at)}
              onChange={e => set({ end_at: toIsoOrEmpty(e.target.value) })}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl border-2 border-gray-200 bg-white overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm">
          {ann.image_url
            ? <Image src={ann.image_url} alt="Announcement" width={64} height={64} className="object-cover w-full h-full" />
            : <ImageIcon size={24} className="text-gray-300" />}
        </div>
        <div className="flex-1 space-y-2">
          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold cursor-pointer transition hover:scale-105
            ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-gray-700'}`}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : 'Upload Image'}
            <input type="file" accept="image/*" className="hidden" disabled={uploading}
              onChange={e => handleImageUpload(e.target.files?.[0])} />
          </label>
          <input
            value={ann.image_url ?? ''}
            onChange={e => set({ image_url: e.target.value })}
            placeholder="Or paste image URL"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border-2 border-gray-100 bg-white p-4">
        <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Bell size={14} className="text-primary" /> Preview
        </p>
        <div className="rounded-xl bg-gray-900 text-white p-4">
          <p className="font-bold text-base">{ann.title || 'Announcement title'}</p>
          <p className="text-sm text-white/80 mt-1">{ann.message || 'Your message appears here…'}</p>
          {ann.link_url && (
            <p className="text-xs text-white/60 underline mt-2 truncate">{ann.link_url}</p>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────── */}
      {/* Push Broadcast Section                          */}
      {/* ─────────────────────────────────────────────── */}
      <div className="border-t-2 border-dashed border-orange-200 pt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 border border-red-200 shadow-sm">
            <BellRing size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900">Broadcast Push Notification</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Send an in-app notification to users immediately — separate from the banner/popup
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border-2 border-red-200 p-5 space-y-5">

          {/* Use announcement content toggle */}
          <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-gray-200">
            <div>
              <p className="text-sm font-bold text-gray-900">Use announcement title &amp; message</p>
              <p className="text-xs text-gray-500 mt-0.5">Auto-fill from the fields above</p>
            </div>
            <Toggle checked={useAnnContent} onChange={setUseAnnContent} />
          </div>

          {/* Custom content override */}
          {!useAnnContent && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Push Title</label>
                <input
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Custom push title"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Push Message</label>
                <textarea
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  rows={2}
                  placeholder="Custom push message"
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Target selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 flex items-center gap-1.5">
              <Users size={13} /> Target Audience
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.entries(TARGET_LABELS) as [PushTarget, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPushTarget(val)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all hover:scale-105
                    ${pushTarget === val
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/20'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary/40'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Channel indicators */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-700">
              <Smartphone size={13} className="text-green-600" />
              In-app notifications
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 text-xs font-semibold text-gray-700">
              <Globe size={13} className="text-blue-500" />
              Web push (if configured)
              <span className="text-blue-500 font-bold">✓</span>
            </div>
          </div>

          {/* Success result */}
          {pushSent !== null && (
            <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-xl px-4 py-3 animate-in fade-in duration-300">
              <CheckCircle2 size={18} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-800 font-semibold">
                Successfully sent to <strong>{pushSent}</strong> user{pushSent !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              This will insert a notification record for every matching user.
              Large audiences may take a few seconds.
            </p>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleBroadcastPush}
            disabled={sending || (!useAnnContent && (!customTitle.trim() || !customMessage.trim()))}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-extrabold text-base shadow-xl hover:from-red-600 hover:to-orange-600 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {sending
              ? <><Loader2 size={20} className="animate-spin" /> Sending…</>
              : <><Send size={20} /> Broadcast Now — {TARGET_LABELS[pushTarget]}</>
            }
          </button>
        </div>
      </div>

    </div>
  );
}