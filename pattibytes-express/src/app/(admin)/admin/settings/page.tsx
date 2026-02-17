/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
  Truck,
  Settings2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Store,
  DollarSign,
  MapPinned,
  Ruler,
  Navigation,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

const TABLE = 'app_settings';

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
  start_at?: string;
  end_at?: string;
  dismissible: boolean;
  dismiss_key: string;
};

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type DeliveryFeeSchedule = {
  timezone: string;
  weekly: Record<DayKey, { enabled: boolean; fee: number }>;
  overrides: Array<any>;
  ui?: {
    show_to_customer?: boolean;
  };
};

interface Settings {
  id?: string;
  app_name: string;
   app_logo_url: string;
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

  // ✅ NEW: Delivery Area Configuration
  base_delivery_radius_km: number; // Base area radius in km
  per_km_fee_beyond_base: number; // Fee per km beyond base area

  custom_links: CustomLink[];
  announcement: Announcement;
  show_menu_images: boolean;

  delivery_fee_enabled: boolean;
  delivery_fee_schedule: DeliveryFeeSchedule;
}

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

function uid() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

const asNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const asBool = (v: any, fallback = false) => {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
};

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

function defaultDeliveryFeeSchedule(defaultFee = 40): DeliveryFeeSchedule {
  return {
    timezone: 'Asia/Kolkata',
    weekly: {
      mon: { enabled: true, fee: defaultFee },
      tue: { enabled: true, fee: defaultFee },
      wed: { enabled: true, fee: defaultFee },
      thu: { enabled: true, fee: defaultFee },
      fri: { enabled: true, fee: defaultFee },
      sat: { enabled: true, fee: defaultFee },
      sun: { enabled: false, fee: 0 },
    },
    overrides: [],
    ui: { show_to_customer: true },
  };
}

function parseSchedule(v: any, fallbackFee: number): DeliveryFeeSchedule {
  try {
    if (!v) return defaultDeliveryFeeSchedule(fallbackFee);
    const obj = typeof v === 'string' ? JSON.parse(v) : v;
    const base = defaultDeliveryFeeSchedule(fallbackFee);

    const weekly = { ...base.weekly, ...(obj?.weekly || {}) };
    for (const { key } of DAYS) {
      weekly[key] = {
        enabled: asBool(weekly[key]?.enabled, true),
        fee: Math.max(0, asNum(weekly[key]?.fee, fallbackFee)),
      };
    }

    const ui = { ...base.ui, ...(obj?.ui || {}) };

    return {
      timezone: String(obj?.timezone || base.timezone),
      weekly,
      overrides: Array.isArray(obj?.overrides) ? obj.overrides : [],
      ui,
    };
  } catch {
    return defaultDeliveryFeeSchedule(fallbackFee);
  }
}

function dayKeyForNow(timezone: string): DayKey {
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(new Date());
  const k = short.toLowerCase().slice(0, 3);
  return (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(k) ? k : 'mon') as DayKey;
}

export default function SettingsPage() {
  const { logout } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<Settings>(() => {
    const fallbackFee = 40;
    return {
      app_name: 'PattiBytes Express',
      app_logo_url: '',
      support_email: 'support@pattibytes.com',
      support_phone: '+91 98765 43210',
      business_address: 'Patti, Punjab, India',

      facebook_url: '',
      instagram_url: '',
      twitter_url: '',
      youtube_url: '',
      website_url: '',

      delivery_fee: fallbackFee,
      min_order_amount: 100,
      tax_percentage: 0,

      base_delivery_radius_km: 5, // ✅ Default 5km base area
      per_km_fee_beyond_base: 10, // ✅ Default ₹10/km beyond base

      custom_links: [],
      announcement: defaultAnnouncement(),
      show_menu_images: true,

      delivery_fee_enabled: true,
      delivery_fee_schedule: defaultDeliveryFeeSchedule(fallbackFee),
    };
  });
  
  function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp size={20} className="text-gray-600" />
        ) : (
          <ChevronDown size={20} className="text-gray-600" />
        )}
      </button>

      {expanded && <div className="px-6 py-5 border-t border-gray-100">{children}</div>}
    </div>
  );
}


  // Section collapse states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    delivery: true,
    announcement: false,
    social: false,
    custom: false,
    orders: false,
    performance: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [draft, setDraft] = useState<CustomLink>({
    id: uid(),
    title: '',
    url: '',
    logo_url: '',
    enabled: true,
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAnnouncementImage, setUploadingAnnouncementImage] = useState(false);
  const [uploadingAppLogo, setUploadingAppLogo] = useState(false);

  const ann = settings.announcement || defaultAnnouncement();

  const todayKey = useMemo(() => {
    const tz = settings.delivery_fee_schedule?.timezone || 'Asia/Kolkata';
    return dayKeyForNow(tz);
  }, [settings.delivery_fee_schedule?.timezone]);

  const todayRule = useMemo(() => {
    const schedule = settings.delivery_fee_schedule || defaultDeliveryFeeSchedule(settings.delivery_fee);
    const rule = schedule.weekly?.[todayKey] || { enabled: true, fee: settings.delivery_fee };
    return { key: todayKey, ...rule };
  }, [settings.delivery_fee_schedule, settings.delivery_fee, todayKey]);

  useEffect(() => {
    loadSettings();
  }, []);

 const loadSettings = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.from(TABLE).select('*').single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      const fallbackFee = asNum((data as any).delivery_fee, 40);

      const customLinksRaw = Array.isArray((data as any).custom_links) ? (data as any).custom_links : [];
      const annRaw = (data as any).announcement;

      const normalizedAnn: Announcement = {
        ...defaultAnnouncement(),
        ...(annRaw && typeof annRaw === 'object' ? annRaw : {}),
      };

      const schedule = parseSchedule((data as any).delivery_fee_schedule, fallbackFee);

      const showToCustomerFromColumn = (data as any).delivery_fee_show_to_customer;
      if (showToCustomerFromColumn !== undefined) {
        schedule.ui = { ...(schedule.ui || {}), show_to_customer: asBool(showToCustomerFromColumn, true) };
      }

      setSettings({
        id: (data as any).id,
        app_name: String((data as any).app_name || 'PattiBytes Express'),
        app_logo_url: normalizeMaybeMarkdownUrl((data as any).app_logo_url || ''), // ✅ ADD THIS LINE

        support_email: normalizeMaybeMarkdownUrl((data as any).support_email || ''),
        support_phone: String((data as any).support_phone || ''),
        business_address: String((data as any).business_address || ''),

        facebook_url: normalizeMaybeMarkdownUrl((data as any).facebook_url || ''),
        instagram_url: normalizeMaybeMarkdownUrl((data as any).instagram_url || ''),
        twitter_url: normalizeMaybeMarkdownUrl((data as any).twitter_url || ''),
        youtube_url: normalizeMaybeMarkdownUrl((data as any).youtube_url || ''),
        website_url: normalizeMaybeMarkdownUrl((data as any).website_url || ''),

        delivery_fee: fallbackFee,
        min_order_amount: asNum((data as any).min_order_amount, 100),
        tax_percentage: asNum((data as any).tax_percentage, 0),

        base_delivery_radius_km: asNum((data as any).base_delivery_radius_km, 5),
        per_km_fee_beyond_base: asNum((data as any).per_km_fee_beyond_base, 10),

        custom_links: customLinksRaw
          .map((x: any) => ({
            id: String(x?.id || uid()),
            title: String(x?.title || ''),
            url: normalizeMaybeMarkdownUrl(x?.url || ''),
            logo_url: normalizeMaybeMarkdownUrl(x?.logo_url || ''),
            enabled: asBool(x?.enabled, true),
          }))
          .filter((x: CustomLink) => x.title || x.url || x.logo_url),

        announcement: {
          ...normalizedAnn,
          type: normalizedAnn.type === 'popup' ? 'popup' : 'banner',
          enabled: asBool(normalizedAnn.enabled, false),
          title: String(normalizedAnn.title || ''),
          message: String(normalizedAnn.message || ''),
          image_url: String(normalizedAnn.image_url || ''),
          link_url: String(normalizedAnn.link_url || ''),
          start_at: String(normalizedAnn.start_at || ''),
          end_at: String(normalizedAnn.end_at || ''),
          dismissible: asBool((normalizedAnn as any).dismissible, true),
          dismiss_key: String((normalizedAnn as any).dismiss_key || 'v1'),
        },

        show_menu_images: asBool((data as any).show_menu_images, true),

        delivery_fee_enabled: asBool((data as any).delivery_fee_enabled, true),
        delivery_fee_schedule: schedule,
      });
    }
  } catch (e: any) {
    console.error('Failed to load settings:', e);
    toast.error(e?.message || 'Failed to load settings');
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
      enabled: Boolean(draft.enabled),
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

  const setAllDays = (enabled: boolean, fee?: number) => {
    setSettings((p) => {
      const schedule = p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee);
      const nextWeekly: any = { ...schedule.weekly };
      for (const { key } of DAYS) {
        nextWeekly[key] = {
          enabled,
          fee: Math.max(0, fee !== undefined ? fee : asNum(nextWeekly[key]?.fee, p.delivery_fee)),
        };
      }
      return {
        ...p,
        delivery_fee_schedule: { ...schedule, weekly: nextWeekly },
      };
    });
  };

  // ✅ ADD THESE HANDLERS
const onUploadAppLogo = async (file?: File | null) => {
  if (!file) return;
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    return toast.error('Please choose an image file (PNG, JPG, WEBP, SVG)');
  }

  // Check file size (2MB limit)
  if (file.size > 2 * 1024 * 1024) {
    return toast.error('File size must be less than 2MB');
  }

  setUploadingAppLogo(true);
  try {
    const url = await uploadToCloudinary(file);
    setSettings((p) => ({ ...p, app_logo_url: url }));
    toast.success('✅ App logo uploaded successfully!');
  } catch (e: any) {
    console.error('Logo upload error:', e);
    toast.error(e?.message || 'Failed to upload logo');
  } finally {
    setUploadingAppLogo(false);
  }
};

const removeAppLogo = () => {
  setSettings((p) => ({ ...p, app_logo_url: '' }));
  toast.success('Logo removed');
};

  const copyDayToAll = (from: DayKey) => {
    setSettings((p) => {
      const schedule = p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee);
      const src = schedule.weekly[from];
      const nextWeekly: any = { ...schedule.weekly };
      for (const { key } of DAYS) {
        nextWeekly[key] = { ...src };
      }
      return { ...p, delivery_fee_schedule: { ...schedule, weekly: nextWeekly } };
    });
    toast.success('Copied to all days');
  };

  const handleSave = async () => {
  setSaving(true);
  try {
    const schedule = settings.delivery_fee_schedule || defaultDeliveryFeeSchedule(settings.delivery_fee);

    const payload: any = {
      ...settings,

      app_logo_url: normalizeMaybeMarkdownUrl(settings.app_logo_url), 
      support_email: normalizeMaybeMarkdownUrl(settings.support_email),
      facebook_url: normalizeMaybeMarkdownUrl(settings.facebook_url),
        instagram_url: normalizeMaybeMarkdownUrl(settings.instagram_url),
        twitter_url: normalizeMaybeMarkdownUrl(settings.twitter_url),
        youtube_url: normalizeMaybeMarkdownUrl(settings.youtube_url),
        website_url: normalizeMaybeMarkdownUrl(settings.website_url),

        delivery_fee: Math.max(0, asNum(settings.delivery_fee, 0)),
        min_order_amount: Math.max(0, asNum(settings.min_order_amount, 0)),
        tax_percentage: Math.max(0, asNum(settings.tax_percentage, 0)),

        // ✅ Save new delivery area fields
        base_delivery_radius_km: Math.max(0, asNum(settings.base_delivery_radius_km, 5)),
        per_km_fee_beyond_base: Math.max(0, asNum(settings.per_km_fee_beyond_base, 10)),

        custom_links: (settings.custom_links || []).map((x) => ({
          ...x,
          title: String(x.title || '').trim(),
          url: normalizeHttpUrl(String(x.url || '').trim()),
          logo_url: normalizeMaybeMarkdownUrl(x.logo_url || ''),
          enabled: Boolean(x.enabled),
        })),

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

        show_menu_images: Boolean(settings.show_menu_images),

        delivery_fee_enabled: Boolean(settings.delivery_fee_enabled),
        delivery_fee_schedule: schedule,

        delivery_fee_show_to_customer: asBool(schedule?.ui?.show_to_customer, true),
      };

      const { error } = await supabase.from(TABLE).upsert(payload);
      if (error) throw error;

      toast.success('✅ Settings saved successfully!');
    } catch (e: any) {
      console.error('Failed to save settings:', e);
      toast.error(e?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-gray-200 h-96 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const showToCustomer = asBool(settings.delivery_fee_schedule?.ui?.show_to_customer, true);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings2 size={28} className="text-primary" />
              App Settings
            </h1>
            <p className="text-sm text-gray-600 mt-1">Configure your application</p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Save Button (Top) */}
        <div className="mb-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white px-6 py-3 rounded-xl hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

        <div className="space-y-4">
          {/* ==================== GENERAL SETTINGS ==================== */}
         <CollapsibleSection
  title="General Settings"
  icon={<Store size={20} className="text-primary" />}
  expanded={expandedSections.general}
  onToggle={() => toggleSection('general')}
>
  <div className="grid gap-6">
    {/* App Name */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
      <input
        type="text"
        value={settings.app_name}
        onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
        placeholder="Enter app name"
      />
    </div>

    {/* ✅ App Logo Upload Section */}
    <div className="border-t pt-6">
      <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
        <ImageIcon size={18} className="text-primary" />
        App Logo
      </label>

      {/* Logo Preview */}
      {settings.app_logo_url && (
        <div className="mb-4 flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-primary/20 shadow-lg bg-white">
            <Image
              src={settings.app_logo_url}
              alt="App Logo"
              fill
              className="object-cover p-1"
              onError={() => setSettings((p) => ({ ...p, app_logo_url: '' }))}
            />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Current Logo</p>
            <p className="text-xs text-gray-600 truncate max-w-md">{settings.app_logo_url}</p>
          </div>
          <button
            onClick={removeAppLogo}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <Trash2 size={16} />
            Remove
          </button>
        </div>
      )}

      {/* Upload Button */}
      <div className="space-y-3">
        <label
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all shadow-md ${
            uploadingAppLogo
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white'
          }`}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            onChange={(e) => onUploadAppLogo(e.target.files?.[0])}
            disabled={uploadingAppLogo}
            className="hidden"
          />
          {uploadingAppLogo ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={20} />
              {settings.app_logo_url ? 'Change Logo' : 'Upload Logo'}
            </>
          )}
        </label>

        {/* Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Logo Guidelines
          </h4>
          <ul className="text-xs text-blue-800 space-y-1 ml-5 list-disc">
            <li>
              <strong>Size:</strong> 512x512px or larger (square format)
            </li>
            <li>
              <strong>Formats:</strong> PNG (recommended), JPG, WEBP, or SVG
            </li>
            <li>
              <strong>File size:</strong> Maximum 2MB
            </li>
            <li>
              <strong>Background:</strong> Transparent PNG or white background works best
            </li>
            <li>
              <strong>Display:</strong> Logo will appear in a circular frame
            </li>
          </ul>
        </div>

        {/* Success Message */}
        {settings.app_logo_url && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
            <CheckCircle2 size={18} className="text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <strong>Logo uploaded!</strong> Remember to click{' '}
              <strong className="text-primary">&quot;Save All Settings&quot;</strong> button at the top to apply changes.
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Contact Information */}
    <div className="grid md:grid-cols-2 gap-4 border-t pt-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Mail size={16} />
          Support Email
        </label>
        <input
          type="email"
          value={settings.support_email}
          onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="support@example.com"
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="+91 98765 43210"
        />
      </div>
    </div>

    {/* Business Address */}
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <MapPin size={16} />
        Business Address
      </label>
      <textarea
        value={settings.business_address}
        onChange={(e) => setSettings({ ...settings, business_address: e.target.value })}
        rows={3}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
        placeholder="Enter your business address"
      />
    </div>
  </div>
</CollapsibleSection>


         {/* ==================== DELIVERY & PRICING ==================== */}
<CollapsibleSection
  title="Delivery & Pricing Configuration"
  icon={<Truck size={20} className="text-primary" />}
  expanded={expandedSections.delivery}
  onToggle={() => toggleSection('delivery')}
>
  <div className="space-y-4 sm:space-y-6">
    {/* Delivery Toggles */}
    <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-4 bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg border border-orange-200">
      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
        <input
          type="checkbox"
          checked={settings.delivery_fee_enabled}
          onChange={(e) => setSettings((p) => ({ ...p, delivery_fee_enabled: e.target.checked }))}
          className="w-4 h-4 rounded"
        />
        <span>Enable Delivery Fee</span>
      </label>

      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800">
        <input
          type="checkbox"
          checked={showToCustomer}
          disabled={!settings.delivery_fee_enabled}
          onChange={(e) =>
            setSettings((p) => ({
              ...p,
              delivery_fee_schedule: {
                ...(p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee)),
                ui: {
                  ...((p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee)).ui || {}),
                  show_to_customer: e.target.checked,
                },
              },
            }))
          }
          className="w-4 h-4 rounded disabled:opacity-50"
        />
        <span>Show to Customers</span>
      </label>

      {settings.delivery_fee_enabled ? (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-xs sm:ml-auto">
          <CheckCircle2 className="w-4 h-4" />
          Active
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-200 text-gray-700 font-semibold text-xs sm:ml-auto">
          <AlertTriangle className="w-4 h-4" />
          Disabled
        </span>
      )}
    </div>

    {/* ✅ Delivery Area Configuration */}
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
        <MapPinned size={18} className="text-blue-600 shrink-0" />
        <span>Delivery Area Pricing</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Base Radius */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Ruler size={16} className="text-blue-600 shrink-0" />
            <span className="truncate">Base Delivery Radius (km)</span>
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={settings.base_delivery_radius_km}
            onChange={(e) => setSettings({ ...settings, base_delivery_radius_km: Math.max(0, Number(e.target.value)) })}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold text-base sm:text-lg"
          />
          <p className="text-xs text-gray-600 mt-2">
            ✅ Within this radius, <strong>base delivery fee</strong> applies
          </p>
        </div>

        {/* Per KM Fee */}
        <div className="bg-white rounded-lg p-3 sm:p-4 border shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <DollarSign size={16} className="text-green-600 shrink-0" />
            <span className="truncate">Fee per KM (Beyond Base)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
            <input
              type="number"
              min={0}
              step={1}
              value={settings.per_km_fee_beyond_base}
              onChange={(e) => setSettings({ ...settings, per_km_fee_beyond_base: Math.max(0, Number(e.target.value)) })}
              className="w-full pl-8 pr-3 sm:pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-semibold text-base sm:text-lg"
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            ✅ Additional fee per km beyond base radius
          </p>
        </div>
      </div>

      {/* Example Calculation */}
      <div className="mt-3 sm:mt-4 bg-white rounded-lg p-3 sm:p-4 border-2 border-green-200">
        <p className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Navigation size={16} className="text-green-600 shrink-0" />
          <span>Pricing Example</span>
        </p>
        <div className="text-xs sm:text-sm text-gray-700 space-y-1">
          <p className="break-words">
            • <strong>Base area ({settings.base_delivery_radius_km}km):</strong> ₹{todayRule.fee} (base fee)
          </p>
          <p className="break-words">
            • <strong>7km delivery (2km beyond):</strong> ₹{todayRule.fee} + (2 × ₹{settings.per_km_fee_beyond_base}) = <strong className="text-primary">₹{todayRule.fee + (2 * settings.per_km_fee_beyond_base)}</strong>
          </p>
          <p className="break-words">
            • <strong>10km delivery (5km beyond):</strong> ₹{todayRule.fee} + (5 × ₹{settings.per_km_fee_beyond_base}) = <strong className="text-primary">₹{todayRule.fee + (5 * settings.per_km_fee_beyond_base)}</strong>
          </p>
        </div>
      </div>
    </div>

    {/* Base Fee & Timezone */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {/* Base Delivery Fee */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Base Delivery Fee (₹)</label>
        <input
          type="number"
          min={0}
          value={settings.delivery_fee}
          onChange={(e) => setSettings({ ...settings, delivery_fee: Math.max(0, Number(e.target.value)) })}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
        />
        <p className="text-xs text-gray-600 mt-1">Used for day-wise schedule</p>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Settings2 className="w-4 h-4 shrink-0" />
          <span>Timezone</span>
        </label>
        <input
          type="text"
          value={settings.delivery_fee_schedule?.timezone || 'Asia/Kolkata'}
          onChange={(e) =>
            setSettings((p) => ({
              ...p,
              delivery_fee_schedule: {
                ...(p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee)),
                timezone: e.target.value || 'Asia/Kolkata',
              },
            }))
          }
          placeholder="Asia/Kolkata"
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      {/* Today's Rule */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-xs text-gray-600 font-semibold">Today&apos;s Rule</p>
        <p className="text-base sm:text-lg font-extrabold text-gray-900 mt-1">
          {todayRule.key.toUpperCase()} • {todayRule.enabled ? `₹${todayRule.fee}` : 'Disabled'}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {showToCustomer ? 'Visible to customers' : 'Hidden from customers'}
        </p>
      </div>
    </div>

    {/* Bulk Actions */}
    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
      <button
        type="button"
        onClick={() => setAllDays(true, settings.delivery_fee)}
        disabled={!settings.delivery_fee_enabled}
        className="w-full sm:w-auto px-4 py-2 rounded-lg border-2 bg-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-green-50 hover:border-green-300 transition-colors"
      >
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>Enable All Days</span>
      </button>

      <button
        type="button"
        onClick={() => setAllDays(false, 0)}
        className="w-full sm:w-auto px-4 py-2 rounded-lg border-2 bg-white text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        <EyeOff className="w-4 h-4 shrink-0" />
        <span>Disable All Days</span>
      </button>

      <button
        type="button"
        onClick={() => copyDayToAll('mon')}
        disabled={!settings.delivery_fee_enabled}
        className="w-full sm:w-auto px-4 py-2 rounded-lg border-2 bg-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-blue-50 hover:border-blue-300 transition-colors"
        title="Copy Monday settings to all days"
      >
        <Copy className="w-4 h-4 shrink-0" />
        <span>Copy Monday to All</span>
      </button>
    </div>

    {/* Weekly Schedule */}
    <div className="rounded-lg border overflow-hidden bg-white">
      <div className="px-3 sm:px-4 py-3 border-b bg-gray-50">
        <p className="font-bold text-gray-900 text-sm sm:text-base">Weekly Delivery Fee Schedule</p>
      </div>

      <div className="divide-y">
        {DAYS.map(({ key, label }) => {
          const schedule = settings.delivery_fee_schedule || defaultDeliveryFeeSchedule(settings.delivery_fee);
          const rule = schedule.weekly?.[key] || { enabled: true, fee: settings.delivery_fee };

          return (
            <div 
              key={key} 
              className="px-3 sm:px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              {/* Mobile Layout (< 640px) */}
              <div className="flex flex-col gap-3 sm:hidden">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-base">{label}</span>
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                    <input
                      type="checkbox"
                      checked={!!rule.enabled}
                      disabled={!settings.delivery_fee_enabled}
                      onChange={(e) =>
                        setSettings((p) => {
                          const sch = p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee);
                          return {
                            ...p,
                            delivery_fee_schedule: {
                              ...sch,
                              weekly: {
                                ...sch.weekly,
                                [key]: { ...sch.weekly[key], enabled: e.target.checked },
                              },
                            },
                          };
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span>Enabled</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={asNum(rule.fee, settings.delivery_fee)}
                    disabled={!settings.delivery_fee_enabled || !rule.enabled}
                    onChange={(e) => {
                      const fee = Math.max(0, asNum(e.target.value, 0));
                      setSettings((p) => {
                        const sch = p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee);
                        return {
                          ...p,
                          delivery_fee_schedule: {
                            ...sch,
                            weekly: { ...sch.weekly, [key]: { ...sch.weekly[key], fee } },
                          },
                        };
                      });
                    }}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-semibold disabled:bg-gray-100"
                    placeholder="Fee (₹)"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => copyDayToAll(key)}
                    disabled={!settings.delivery_fee_enabled}
                    title="Copy this day to all days"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Desktop Layout (>= 640px) */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-3 items-center">
                <div className="col-span-2 font-bold text-gray-900">{label}</div>

                <label className="col-span-4 flex items-center gap-2 text-sm text-gray-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={!!rule.enabled}
                    disabled={!settings.delivery_fee_enabled}
                    onChange={(e) =>
                      setSettings((p) => {
                        const sch = p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee);
                        return {
                          ...p,
                          delivery_fee_schedule: {
                            ...sch,
                            weekly: {
                              ...sch.weekly,
                              [key]: { ...sch.weekly[key], enabled: e.target.checked },
                            },
                          },
                        };
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Enabled</span>
                </label>

                <div className="col-span-6">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={asNum(rule.fee, settings.delivery_fee)}
                      disabled={!settings.delivery_fee_enabled || !rule.enabled}
                      onChange={(e) => {
                        const fee = Math.max(0, asNum(e.target.value, 0));
                        setSettings((p) => {
                          const sch = p.delivery_fee_schedule || defaultDeliveryFeeSchedule(p.delivery_fee);
                          return {
                            ...p,
                            delivery_fee_schedule: {
                              ...sch,
                              weekly: { ...sch.weekly, [key]: { ...sch.weekly[key], fee } },
                            },
                          };
                        });
                      }}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm font-semibold disabled:bg-gray-100"
                      placeholder="Fee (₹)"
                    />
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                      onClick={() => copyDayToAll(key)}
                      disabled={!settings.delivery_fee_enabled}
                      title="Copy this day to all days"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
</CollapsibleSection>


          {/* ==================== ORDER SETTINGS ==================== */}
          <CollapsibleSection
            title="Order Settings"
            icon={<DollarSign size={20} className="text-primary" />}
            expanded={expandedSections.orders}
            onToggle={() => toggleSection('orders')}
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.min_order_amount}
                  onChange={(e) => setSettings({ ...settings, min_order_amount: Math.max(0, Number(e.target.value)) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Percentage (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.tax_percentage}
                  onChange={(e) => setSettings({ ...settings, tax_percentage: Math.max(0, Math.min(100, Number(e.target.value))) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ==================== ANNOUNCEMENTS ==================== */}
          <CollapsibleSection
            title="Announcements (Banner/Popup)"
            icon={<Megaphone size={20} className="text-primary" />}
            expanded={expandedSections.announcement}
            onToggle={() => toggleSection('announcement')}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-lg">
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
                    className="w-4 h-4"
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
                    className="px-3 py-2 rounded-lg border bg-white text-sm font-semibold"
                  >
                    <option value="banner">Top Banner</option>
                    <option value="popup">Popup Modal</option>
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
                    className="w-4 h-4"
                  />
                  Dismissible
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <KeyRound size={16} />
                    Dismiss Key (version)
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
                      className="flex-1 px-4 py-3 border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((p) => ({
                          ...p,
                          announcement: { ...(p.announcement || defaultAnnouncement()), dismiss_key: `v${Date.now()}` },
                        }))
                      }
                      className="px-4 py-3 rounded-lg bg-gray-900 text-white font-semibold"
                      title="Generate new key"
                    >
                      New
                    </button>
                  </div>
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
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
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
                    className="w-full px-4 py-3 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} />
                    Active Window (optional)
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
                      className="w-full px-3 py-3 border rounded-lg text-sm"
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
                      className="w-full px-3 py-3 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image (optional)</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-lg border bg-white overflow-hidden flex items-center justify-center">
                      {ann.image_url ? (
                        <Image src={ann.image_url} alt="Announcement" width={64} height={64} className="object-cover w-full h-full" />
                      ) : (
                        <ImageIcon className="text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold cursor-pointer">
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
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-4">
                  <p className="text-sm font-extrabold text-gray-900 mb-2">Preview</p>
                  <div className="rounded-lg border bg-gray-900 text-white p-3">
                    <div className="font-extrabold">{ann.title || 'Announcement title'}</div>
                    <div className="text-sm text-white/90 mt-1">{ann.message || 'Announcement message...'}</div>
                    {!!ann.link_url && <div className="text-xs text-white/80 mt-2 underline break-all">{ann.link_url}</div>}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ==================== SOCIAL MEDIA ==================== */}
          <CollapsibleSection
            title="Social Media Links"
            icon={<Globe size={20} className="text-primary" />}
            expanded={expandedSections.social}
            onToggle={() => toggleSection('social')}
          >
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
          </CollapsibleSection>

          {/* ==================== CUSTOM LINKS ==================== */}
          <CollapsibleSection
            title="Custom Links"
            icon={<LinkIcon size={20} className="text-primary" />}
            expanded={expandedSections.custom}
            onToggle={() => toggleSection('custom')}
          >
            <div className="space-y-4">
              {/* Add New Link */}
              <div className="bg-gradient-to-br from-orange-50 to-white p-4 rounded-lg border">
                <p className="text-sm font-semibold text-gray-900 mb-3">Add New Custom Link</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 rounded-lg border bg-white overflow-hidden flex items-center justify-center">
                        {draft.logo_url ? (
                          <Image src={draft.logo_url} alt="Logo" width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <LinkIcon className="text-gray-400" size={20} />
                        )}
                      </div>

                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold cursor-pointer">
                        <Upload size={14} />
                        {uploadingLogo ? '...' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => onUploadDraftLogo(e.target.files?.[0])}
                          disabled={uploadingLogo}
                        />
                      </label>
                    </div>
                    <input
                      value={draft.logo_url}
                      onChange={(e) => setDraft((p) => ({ ...p, logo_url: e.target.value }))}
                      placeholder="Or paste URL"
                      className="w-full mt-2 px-3 py-2 border rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      value={draft.title}
                      onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. WhatsApp Support"
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                    <input
                      value={draft.url}
                      onChange={(e) => setDraft((p) => ({ ...p, url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft((p) => ({ ...p, enabled: e.target.checked }))} className="w-4 h-4" />
                    Enabled
                  </label>

                  <button
                    type="button"
                    onClick={addDraftLink}
                    disabled={!canAddDraft}
                    className="px-4 py-2 rounded-lg bg-primary text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus size={18} />
                    Add Link
                  </button>
                </div>
              </div>

              {/* Existing Links */}
              <div className="space-y-2">
                {settings.custom_links.length === 0 ? (
                  <div className="text-sm text-gray-600 bg-gray-50 border rounded-lg p-4">No custom links yet.</div>
                ) : (
                  settings.custom_links.map((l, idx) => (
                    <div
                      key={l.id}
                      className={`border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between ${l.enabled ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg border bg-white overflow-hidden flex items-center justify-center shrink-0">
                          {l.logo_url ? (
                            <Image src={l.logo_url} alt={l.title} width={40} height={40} className="object-cover w-full h-full" />
                          ) : (
                            <Globe className="text-gray-400" size={20} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate text-sm">{l.title || 'Untitled'}</div>
                          <a
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary font-semibold hover:underline truncate block"
                          >
                            {l.url}
                          </a>
                          {!l.enabled ? <div className="text-xs text-gray-500">Hidden</div> : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => toggleCustomLink(l.id)}
                          className="px-2 py-1 rounded-lg border bg-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          {l.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                          {l.enabled ? 'On' : 'Off'}
                        </button>

                        <button
                          type="button"
                          onClick={() => moveCustomLink(l.id, 'up')}
                          disabled={idx === 0}
                          className="px-2 py-1 rounded-lg border bg-white text-xs font-semibold disabled:opacity-50"
                        >
                          <ArrowUp size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => moveCustomLink(l.id, 'down')}
                          disabled={idx === settings.custom_links.length - 1}
                          className="px-2 py-1 rounded-lg border bg-white text-xs font-semibold disabled:opacity-50"
                        >
                          <ArrowDown size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeCustomLink(l.id)}
                          className="px-2 py-1 rounded-lg border bg-red-50 text-red-700 text-xs font-semibold"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* ==================== PERFORMANCE ==================== */}
          <CollapsibleSection
            title="Performance Settings"
            icon={<Settings2 size={20} className="text-primary" />}
            expanded={expandedSections.performance}
            onToggle={() => toggleSection('performance')}
          >
            <div className="bg-white p-4 rounded-lg border">
              <label className="flex items-center gap-2 text-sm text-gray-800 font-semibold">
                <input
                  type="checkbox"
                  checked={Boolean(settings.show_menu_images ?? true)}
                  onChange={(e) => setSettings((p) => ({ ...p, show_menu_images: e.target.checked }))}
                  className="w-4 h-4"
                />
                Show menu item images in customer app
              </label>
              <p className="text-xs text-gray-600 mt-2">
                If disabled, images won&apos;t render in customer app (saves bandwidth). Images are still stored.
              </p>
            </div>
          </CollapsibleSection>
        </div>

        {/* Save Button (Bottom) */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary text-white px-6 py-4 rounded-xl hover:bg-orange-600 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border">
          <p className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Delivery: {settings.delivery_fee_enabled ? 'Enabled' : 'Disabled'} • Today ({todayKey}): {todayRule.enabled ? `₹${todayRule.fee}` : 'Disabled'} • Base Area: {settings.base_delivery_radius_km}km • Per KM Beyond: ₹{settings.per_km_fee_beyond_base}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ==================== HELPER COMPONENTS ====================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CollapsibleSection({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        {expanded ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
      </button>

      {expanded && <div className="px-4 py-4 border-t">{children}</div>}
    </div>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: ReactNode;
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
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
