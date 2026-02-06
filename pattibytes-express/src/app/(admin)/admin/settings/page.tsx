/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import Image from 'next/image';
import {
  Save,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Mail,
  Phone,
  MapPin,
  LogOut,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Megaphone,
  PanelTop,
  MessageSquare,
  KeyRound,
  Calendar,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

type CustomLink = {
  id: string;
  title: string;
  url: string;
  logo_url: string;
  enabled: boolean;
};

type AnnouncementType = 'banner' | 'popup';

type Announcement = {
  enabled: boolean;
  type: AnnouncementType;
  title: string;
  message: string;
  image_url?: string;
  link_url?: string;
  start_at?: string; // ISO
  end_at?: string; // ISO
  dismissible: boolean;
  dismiss_key: string; // change to re-show popup after edits
};

interface Settings {
  id?: string;
  app_name: string;
  support_email: string;
  support_phone: string;
  business_address: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url: string;
  website_url: string;
  delivery_fee: number;
  min_order_amount: number;
  tax_percentage: number;
  custom_links?: CustomLink[];

  // ✅ NEW
  announcement?: Announcement;
  show_menu_images?: boolean;
}

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function normalizeMaybeMarkdownUrl(v: any) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const m = s.match(/\((https?:\/\/[^)]+)\)/i);
  return (m?.[1] || s).trim();
}

function normalizeHttpUrl(v: string) {
  const s = normalizeMaybeMarkdownUrl(v);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function toIsoOrEmptyFromDatetimeLocal(v: string) {
  // input like: "2026-02-06T17:30"
  const s = String(v || '').trim();
  if (!s) return '';
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : '';
}

function toDatetimeLocalFromIso(iso?: string) {
  const s = String(iso || '').trim();
  if (!s) return '';
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return '';
  // convert to local datetime-local format (no seconds)
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary env vars missing');

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || 'Cloudinary upload failed');
  return json.secure_url as string;
}

function defaultAnnouncement(): Announcement {
  return {
    enabled: false,
    type: 'banner',
    title: '',
    message: '',
    image_url: '',
    link_url: '',
    start_at: '',
    end_at: '',
    dismissible: true,
    dismiss_key: 'v1',
  };
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    app_name: 'PattiBytes Express',
    support_email: 'support@pattibytes.com',
    support_phone: '+91 98765 43210',
    business_address: 'Ludhiana, Punjab, India',
    facebook_url: '',
    instagram_url: '',
    twitter_url: '',
    youtube_url: '',
    website_url: '',
    delivery_fee: 40,
    min_order_amount: 100,
    tax_percentage: 5,
    custom_links: [],

    // ✅ NEW defaults
    announcement: defaultAnnouncement(),
    show_menu_images: true,
  });

  // New custom link draft
  const [draft, setDraft] = useState<CustomLink>({
    id: uid(),
    title: '',
    url: '',
    logo_url: '',
    enabled: true,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Announcement uploads
  const [uploadingAnnouncementImage, setUploadingAnnouncementImage] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase.from('app_settings').select('*').single();

      // No rows
      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const customLinksRaw = Array.isArray((data as any).custom_links) ? (data as any).custom_links : [];
        const annRaw = (data as any).announcement;

        const ann: Announcement = {
          ...defaultAnnouncement(),
          ...(annRaw && typeof annRaw === 'object' ? annRaw : {}),
        };

        setSettings({
          id: data.id,
          app_name: data.app_name || 'PattiBytes Express',
          support_email: normalizeMaybeMarkdownUrl(data.support_email || ''),
          support_phone: data.support_phone || '',
          business_address: data.business_address || '',
          facebook_url: normalizeMaybeMarkdownUrl(data.facebook_url || ''),
          instagram_url: normalizeMaybeMarkdownUrl(data.instagram_url || ''),
          twitter_url: normalizeMaybeMarkdownUrl(data.twitter_url || ''),
          youtube_url: normalizeMaybeMarkdownUrl(data.youtube_url || ''),
          website_url: normalizeMaybeMarkdownUrl(data.website_url || ''),
          delivery_fee: Number(data.delivery_fee ?? 40),
          min_order_amount: Number(data.min_order_amount ?? 100),
          tax_percentage: Number(data.tax_percentage ?? 5),
          custom_links: customLinksRaw
            .map((x: any) => ({
              id: String(x?.id || uid()),
              title: String(x?.title || ''),
              url: normalizeMaybeMarkdownUrl(x?.url || ''),
              logo_url: normalizeMaybeMarkdownUrl(x?.logo_url || ''),
              enabled: Boolean(x?.enabled ?? true),
            }))
            .filter((x: CustomLink) => x.title || x.url || x.logo_url),

          // ✅ NEW
          announcement: {
            ...ann,
            type: ann.type === 'popup' ? 'popup' : 'banner',
            enabled: Boolean(ann.enabled),
            title: String(ann.title || ''),
            message: String(ann.message || ''),
            image_url: String(ann.image_url || ''),
            link_url: String(ann.link_url || ''),
            start_at: String(ann.start_at || ''),
            end_at: String(ann.end_at || ''),
            dismissible: Boolean(ann.dismissible ?? true),
            dismiss_key: String(ann.dismiss_key || 'v1'),
          },
          show_menu_images: Boolean((data as any).show_menu_images ?? true),
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const canAddDraft = useMemo(() => {
    const titleOk = draft.title.trim().length >= 2;
    const urlOk = draft.url.trim().length >= 6;
    return titleOk && urlOk;
  }, [draft]);

  const addDraftLink = () => {
    if (!canAddDraft) {
      toast.error('Add title + URL (logo is optional)');
      return;
    }

    const next: CustomLink = {
      ...draft,
      title: draft.title.trim(),
      url: normalizeHttpUrl(draft.url.trim()),
      logo_url: normalizeMaybeMarkdownUrl(draft.logo_url.trim()),
    };

    setSettings((prev) => ({
      ...prev,
      custom_links: [...(prev.custom_links || []), next],
    }));

    setDraft({ id: uid(), title: '', url: '', logo_url: '', enabled: true });
  };

  const removeCustomLink = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      custom_links: (prev.custom_links || []).filter((x) => x.id !== id),
    }));
  };

  const moveCustomLink = (id: string, dir: 'up' | 'down') => {
    setSettings((prev) => {
      const list = [...(prev.custom_links || [])];
      const idx = list.findIndex((x) => x.id === id);
      if (idx < 0) return prev;

      const j = dir === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= list.length) return prev;

      const tmp = list[idx];
      list[idx] = list[j];
      list[j] = tmp;

      return { ...prev, custom_links: list };
    });
  };

  const toggleCustomLink = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      custom_links: (prev.custom_links || []).map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)),
    }));
  };

  const onUploadDraftLogo = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');

    setUploadingLogo(true);
    try {
      const url = await uploadToCloudinary(file);
      setDraft((p) => ({ ...p, logo_url: url }));
      toast.success('Logo uploaded');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onUploadAnnouncementImage = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image file');

    setUploadingAnnouncementImage(true);
    try {
      const url = await uploadToCloudinary(file);
      setSettings((p) => ({
        ...p,
        announcement: { ...(p.announcement || defaultAnnouncement()), image_url: url },
      }));
      toast.success('Announcement image uploaded');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Upload failed');
    } finally {
      setUploadingAnnouncementImage(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ann = settings.announcement || defaultAnnouncement();

      const payload: Settings = {
        ...settings,
        
        support_email: normalizeMaybeMarkdownUrl(settings.support_email),
        facebook_url: normalizeMaybeMarkdownUrl(settings.facebook_url),
        instagram_url: normalizeMaybeMarkdownUrl(settings.instagram_url),
        twitter_url: normalizeMaybeMarkdownUrl(settings.twitter_url),
        youtube_url: normalizeMaybeMarkdownUrl(settings.youtube_url),
        website_url: normalizeMaybeMarkdownUrl(settings.website_url),
        custom_links: (settings.custom_links || []).map((x) => ({
          ...x,
          title: x.title.trim(),
          url: normalizeHttpUrl(x.url.trim()),
          logo_url: normalizeMaybeMarkdownUrl(x.logo_url),
          enabled: Boolean(x.enabled),
        })),

        // ✅ NEW: keep announcement clean
        announcement: {
          enabled: Boolean(ann.enabled),
          type: ann.type === 'popup' ? 'popup' : 'banner',
          title: String(ann.title || '').trim(),
          message: String(ann.message || '').trim(),
          image_url: normalizeMaybeMarkdownUrl(ann.image_url || ''),
          link_url: normalizeHttpUrl(String(ann.link_url || '').trim()),
          start_at: String(ann.start_at || '').trim(),
          end_at: String(ann.end_at || '').trim(),
          dismissible: Boolean(ann.dismissible),
          dismiss_key: String(ann.dismiss_key || 'v1').trim() || 'v1',
        },
        show_menu_images: Boolean(settings.show_menu_images ?? true),
        
      };

      const { error } = await supabase.from('app_settings').upsert(payload);
      if (error) throw error;

      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const ann = settings.announcement || defaultAnnouncement();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">App Settings</h1>
            <p className="text-gray-600 mt-1">Configure your application settings</p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 font-medium flex items-center gap-2"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-10 border">
          {/* General Settings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={24} className="text-primary" />
              General Settings
            </h2>

            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
                <input
                  type="text"
                  value={settings.app_name}
                  onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail size={16} />
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone size={16} />
                    Support Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.support_phone}
                    onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin size={16} />
                  Business Address
                </label>
                <textarea
                  value={settings.business_address}
                  onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* ✅ NEW: Announcements */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Megaphone size={20} className="text-primary" />
              Announcements (Banner / Popup)
            </h2>

            <div className="rounded-2xl border bg-gradient-to-br from-orange-50 to-white p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={ann.enabled}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        announcement: { ...(p.announcement || defaultAnnouncement()), enabled: e.target.checked },
                      }))
                    }
                  />
                  Enabled
                </label>

                <div className="flex items-center gap-2">
                  <PanelTop className="w-4 h-4 text-gray-600" />
                  <select
                    value={ann.type}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        announcement: { ...(p.announcement || defaultAnnouncement()), type: e.target.value as any },
                      }))
                    }
                    className="px-3 py-2 rounded-xl border bg-white text-sm font-semibold"
                  >
                    <option value="banner">Top banner</option>
                    <option value="popup">Popup modal</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={ann.dismissible}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        announcement: { ...(p.announcement || defaultAnnouncement()), dismissible: e.target.checked },
                      }))
                    }
                  />
                  Dismissible
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    value={ann.title}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        announcement: { ...(p.announcement || defaultAnnouncement()), title: e.target.value },
                      }))
                    }
                    placeholder="e.g. Free delivery today!"
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <KeyRound size={16} />
                    Dismiss key (version)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={ann.dismiss_key}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          announcement: { ...(p.announcement || defaultAnnouncement()), dismiss_key: e.target.value },
                        }))
                      }
                      placeholder="v1"
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          announcement: { ...(p.announcement || defaultAnnouncement()), dismiss_key: `v${Date.now()}` },
                        }))
                      }
                      className="px-4 py-3 rounded-xl bg-gray-900 text-white font-semibold"
                      title="Generate a new key so popup shows again to users"
                    >
                      New
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Change this when you update announcement content (so users see it again).
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Message
                </label>
                <textarea
                  value={ann.message}
                  onChange={(e) =>
                    setSettings((p) => ({
                      ...p,
                      announcement: { ...(p.announcement || defaultAnnouncement()), message: e.target.value },
                    }))
                  }
                  rows={3}
                  placeholder="Short, clear message"
                  className="w-full px-4 py-3 border rounded-xl"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <LinkIcon size={16} />
                    Link (optional)
                  </label>
                  <input
                    value={ann.link_url || ''}
                    onChange={(e) =>
                      setSettings((p) => ({
                        ...p,
                        announcement: { ...(p.announcement || defaultAnnouncement()), link_url: e.target.value },
                      }))
                    }
                    placeholder="https://..."
                    className="w-full px-4 py-3 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} />
                    Active window (optional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalFromIso(ann.start_at)}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          announcement: {
                            ...(p.announcement || defaultAnnouncement()),
                            start_at: toIsoOrEmptyFromDatetimeLocal(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-3 border rounded-xl text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalFromIso(ann.end_at)}
                      onChange={(e) =>
                        setSettings((p) => ({
                          ...p,
                          announcement: {
                            ...(p.announcement || defaultAnnouncement()),
                            end_at: toIsoOrEmptyFromDatetimeLocal(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-3 py-3 border rounded-xl text-sm"
                    />
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">Start / End in your local time.</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image (optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border bg-white overflow-hidden flex items-center justify-center">
                      {ann.image_url ? (
                        <Image
                          src={ann.image_url}
                          alt="Announcement preview"
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <ImageIcon className="text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold cursor-pointer">
                        <Upload size={16} />
                        {uploadingAnnouncementImage ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onUploadAnnouncementImage(e.target.files?.[0])}
                          disabled={uploadingAnnouncementImage}
                        />
                      </label>

                      <input
                        value={ann.image_url || ''}
                        onChange={(e) =>
                          setSettings((p) => ({
                            ...p,
                            announcement: { ...(p.announcement || defaultAnnouncement()), image_url: e.target.value },
                          }))
                        }
                        placeholder="Or paste image URL"
                        className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-white p-3">
                  <p className="text-sm font-extrabold text-gray-900 mb-2">Preview</p>
                  <div className="rounded-xl border bg-gray-900 text-white p-3">
                    <div className="font-extrabold">{ann.title || 'Announcement title'}</div>
                    <div className="text-sm text-white/90 mt-1">{ann.message || 'Announcement message...'}</div>
                    {!!ann.link_url && (
                      <div className="text-xs text-white/80 mt-2 underline break-all">{ann.link_url}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Social Media Links</h2>
            <div className="grid gap-4">
              <Field
                icon={<Facebook size={16} className="text-blue-600" />}
                label="Facebook URL"
                value={settings.facebook_url}
                onChange={(v) => setSettings({ ...settings, facebook_url: v })}
                placeholder="https://facebook.com/yourpage"
              />
              <Field
                icon={<Instagram size={16} className="text-pink-600" />}
                label="Instagram URL"
                value={settings.instagram_url}
                onChange={(v) => setSettings({ ...settings, instagram_url: v })}
                placeholder="https://instagram.com/yourprofile"
              />
              <Field
                icon={<Twitter size={16} className="text-blue-400" />}
                label="Twitter URL"
                value={settings.twitter_url}
                onChange={(v) => setSettings({ ...settings, twitter_url: v })}
                placeholder="https://twitter.com/yourhandle"
              />
              <Field
                icon={<Youtube size={16} className="text-red-600" />}
                label="YouTube URL"
                value={settings.youtube_url}
                onChange={(v) => setSettings({ ...settings, youtube_url: v })}
                placeholder="https://youtube.com/@yourchannel"
              />
              <Field
                icon={<Globe size={16} className="text-green-600" />}
                label="Website URL"
                value={settings.website_url}
                onChange={(v) => setSettings({ ...settings, website_url: v })}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          {/* Custom Links */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Custom Links</h2>
                <p className="text-sm text-gray-600 mt-1">Add any external link with a logo (paste URL or upload).</p>
              </div>
            </div>

            {/* Add new */}
            <div className="rounded-2xl border bg-gradient-to-br from-orange-50 to-white p-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>

                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl border bg-white overflow-hidden flex items-center justify-center">
                      {draft.logo_url ? (
                        <Image src={draft.logo_url} alt="Logo preview" width={56} height={56} className="object-cover w-full h-full" />
                      ) : (
                        <LinkIcon className="text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold cursor-pointer">
                        <Upload size={16} />
                        {uploadingLogo ? 'Uploading…' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onUploadDraftLogo(e.target.files?.[0])}
                          disabled={uploadingLogo}
                        />
                      </label>

                      <input
                        value={draft.logo_url}
                        onChange={(e) => setDraft((p) => ({ ...p, logo_url: e.target.value }))}
                        placeholder="Or paste logo URL"
                        className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. WhatsApp Support"
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                    <input
                      value={draft.url}
                      onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))}
                      placeholder="e.g. https://wa.me/918278882799"
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draft.enabled}
                        onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))}
                      />
                      Enabled
                    </label>

                    <button
                      type="button"
                      onClick={addDraftLink}
                      disabled={!canAddDraft}
                      className="px-4 py-3 rounded-xl bg-primary text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      <Plus size={18} />
                      Add link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Existing links list */}
            <div className="mt-4 space-y-3">
              {(settings.custom_links || []).length === 0 ? (
                <div className="text-sm text-gray-600 bg-gray-50 border rounded-2xl p-4">No custom links yet.</div>
              ) : (
                (settings.custom_links || []).map((l, idx) => (
                  <div
                    key={l.id}
                    className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${
                      l.enabled ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl border bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {l.logo_url ? (
                          <Image src={l.logo_url} alt={l.title} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <Globe className="text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 truncate">{l.title || 'Untitled'}</div>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary font-semibold hover:underline truncate block max-w-[520px]"
                        >
                          {l.url}
                        </a>
                        {!l.enabled ? <div className="text-xs text-gray-500 mt-1">Hidden</div> : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => toggleCustomLink(l.id)}
                        className="px-3 py-2 rounded-xl border bg-white text-sm font-semibold inline-flex items-center gap-2"
                        title={l.enabled ? 'Disable' : 'Enable'}
                      >
                        {l.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                        {l.enabled ? 'Enabled' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        onClick={() => moveCustomLink(l.id, 'up')}
                        disabled={idx === 0}
                        className="px-3 py-2 rounded-xl border bg-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <ArrowUp size={16} />
                        Up
                      </button>

                      <button
                        type="button"
                        onClick={() => moveCustomLink(l.id, 'down')}
                        disabled={idx === (settings.custom_links || []).length - 1}
                        className="px-3 py-2 rounded-xl border bg-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        <ArrowDown size={16} />
                        Down
                      </button>

                      <button
                        type="button"
                        onClick={() => removeCustomLink(l.id)}
                        className="px-3 py-2 rounded-xl border bg-red-50 text-red-700 text-sm font-semibold inline-flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ✅ Optional: Menu images toggle */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Performance</h2>
            <div className="rounded-2xl border bg-white p-4">
              <label className="flex items-center gap-2 text-sm text-gray-800 font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(settings.show_menu_images ?? true)}
                  onChange={(e) => setSettings((p) => ({ ...p, show_menu_images: e.target.checked }))}
                />
                Show menu item images in customer app
              </label>
              <p className="text-[11px] text-gray-600 mt-1">
                If disabled, images can still be uploaded (image_url is stored) but the UI won’t render them—this saves Cloudinary bandwidth.
              </p>
            </div>
          </div>

          {/* Order Settings */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Settings</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <NumberField
                label="Delivery Fee (₹)"
                value={settings.delivery_fee}
                onChange={(n) => setSettings({ ...settings, delivery_fee: n })}
                min={0}
              />
              <NumberField
                label="Min Order Amount (₹)"
                value={settings.min_order_amount}
                onChange={(n) => setSettings({ ...settings, min_order_amount: n })}
                min={0}
              />
              <NumberField
                label="Tax Percentage (%)"
                value={settings.tax_percentage}
                onChange={(n) => setSettings({ ...settings, tax_percentage: n })}
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Save */}
          <div className="pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary text-white px-6 py-4 rounded-xl hover:bg-orange-600 font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary"
        min={min}
        max={max}
      />
    </div>
  );
}
