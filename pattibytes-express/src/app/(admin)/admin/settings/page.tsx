'use client';
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  Truck, ShoppingBag, Megaphone, Globe,
  Link as LinkIcon, Eye, Settings2, Users,
  Save, Loader2, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

import { SettingsHeader }           from './_components/SettingsHeader';
import { GeneralSection }           from './_components/GeneralSection';
import { DeliverySection }          from './_components/DeliverySection';
import { OrderSection }             from './_components/OrderSection';
import { AnnouncementSection }      from './_components/AnnouncementSection';
import { SocialSection }            from './_components/SocialSection';
import { CustomLinksSection }       from './_components/CustomLinksSection';
import { PerformanceSection }       from './_components/PerformanceSection';
import { MerchantControlSection }   from './_components/MerchantControlSection';
import { MerchantPermissionsSection } from './_components/MerchantPermissionsSection';

import type { Settings } from './_components/types';
import {
  asNum, asBool, normalizeMaybeMarkdownUrl, normalizeHttpUrl,
  parseSchedule, defaultAnnouncement, defaultSchedule, uid,
} from './_components/utils';

const TABLE = 'app_settings';

/* ─── Tab definitions ─────────────────────────────────── */
type TabId =
  | 'general' | 'delivery' | 'orders' | 'announcement'
  | 'social'  | 'custom'   | 'performance' | 'merchants' | 'permissions';

interface Tab { id: TabId; label: string; shortLabel: string; icon: ReactNode; badge?: string; }

const TABS: Tab[] = [
  { id: 'general',      label: 'General',      shortLabel: 'General',   icon: <Settings2   size={16} /> },
  { id: 'delivery',     label: 'Delivery',     shortLabel: 'Delivery',  icon: <Truck        size={16} /> },
  { id: 'orders',       label: 'Orders & Tax', shortLabel: 'Orders',    icon: <ShoppingBag  size={16} /> },
  { id: 'announcement', label: 'Announcement', shortLabel: 'Announce',  icon: <Megaphone    size={16} /> },
  { id: 'social',       label: 'Social Media', shortLabel: 'Social',    icon: <Globe        size={16} /> },
  { id: 'custom',       label: 'Custom Links', shortLabel: 'Links',     icon: <LinkIcon     size={16} /> },
  { id: 'performance',  label: 'Performance',  shortLabel: 'Perf',      icon: <Eye          size={16} /> },
  { id: 'merchants',    label: 'Merchants',    shortLabel: 'Merchants', icon: <Users        size={16} /> },
  { id: 'permissions',  label: 'Permissions',  shortLabel: 'Perms',     icon: <ShieldCheck  size={16} /> },
];

/* ─── Default settings ────────────────────────────────── */
function makeDefault(): Settings {
  const fee = 40;
  return {
    app_name:                 'PattiBytes Express',
    app_logo_url:             '',
    support_email:            'support@pattibytes.com',
    support_phone:            '+91 98765 43210',
    business_address:         'Patti, Punjab, India',
    facebook_url:             '',
    instagram_url:            '',
    twitter_url:              '',
    youtube_url:              '',
    website_url:              '',
    delivery_fee:             fee,
    min_order_amount:         100,
    tax_percentage:           0,
    base_delivery_radius_km:  5,
    per_km_fee_beyond_base:   10,
    customer_search_radius_km: 25,
    custom_links:             [],
    announcement:             defaultAnnouncement(),
    show_menu_images:         true,
    delivery_fee_enabled:     true,
    delivery_fee_schedule:    defaultSchedule(fee),
    free_delivery_enabled:    false,
    free_delivery_above:      999999,
    hub_latitude:             31.2837165,
    hub_longitude:            74.847114,
    admin_preferences:        { auto_reload_enabled: true, auto_reload_interval: 10 },
  };
}

/* ─── Page ────────────────────────────────────────────── */
export default function SettingsPage() {
  const { logout } = useAuth();
  const router     = useRouter();

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [settings,  setSettings]  = useState<Settings>(makeDefault());
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [lastSaved, setLastSaved] = useState<string | undefined>();

  /* ── Load ── */
  useEffect(() => { void loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from(TABLE).select('*').single();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const fallbackFee = asNum(d.delivery_fee, 40);
      const schedule    = parseSchedule(d.delivery_fee_schedule, fallbackFee);

      if (d.delivery_fee_show_to_customer !== undefined) {
        schedule.ui = { ...schedule.ui, show_to_customer: asBool(d.delivery_fee_show_to_customer, true) };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawLinks: any[] = Array.isArray(d.custom_links) ? d.custom_links : [];
      const rawAnn          = d.announcement;

      setSettings({
        id:                       d.id,
        app_name:                 String(d.app_name ?? 'PattiBytes Express'),
        app_logo_url:             normalizeMaybeMarkdownUrl(d.app_logo_url)   ?? '',
        support_email:            normalizeMaybeMarkdownUrl(d.support_email)  ?? '',
        support_phone:            String(d.support_phone  ?? ''),
        business_address:         String(d.business_address ?? ''),
        facebook_url:             normalizeMaybeMarkdownUrl(d.facebook_url)   ?? '',
        instagram_url:            normalizeMaybeMarkdownUrl(d.instagram_url)  ?? '',
        twitter_url:              normalizeMaybeMarkdownUrl(d.twitter_url)    ?? '',
        youtube_url:              normalizeMaybeMarkdownUrl(d.youtube_url)    ?? '',
        website_url:              normalizeMaybeMarkdownUrl(d.website_url)    ?? '',
        delivery_fee:             fallbackFee,
        min_order_amount:         asNum(d.min_order_amount,        100),
        tax_percentage:           asNum(d.tax_percentage,            0),
        base_delivery_radius_km:  asNum(d.base_delivery_radius_km,   5),
        per_km_fee_beyond_base:   asNum(d.per_km_fee_beyond_base,   10),
        customer_search_radius_km: asNum(d.customer_search_radius_km, 25),
        custom_links: rawLinks
          .map(x => ({
            id:       String(x?.id   ?? uid()),
            title:    String(x?.title ?? ''),
            url:      normalizeMaybeMarkdownUrl(x?.url)      ?? '',
            logo_url: normalizeMaybeMarkdownUrl(x?.logo_url) ?? '',
            enabled:  asBool(x?.enabled, true),
          }))
          .filter(x => x.title || x.url),
        announcement: {
          ...defaultAnnouncement(),
          ...(typeof rawAnn === 'object' && rawAnn !== null ? rawAnn : {}),
          type:        rawAnn?.type === 'popup' ? 'popup' : 'banner',
          enabled:     asBool(rawAnn?.enabled,     false),
          dismissible: asBool(rawAnn?.dismissible, true),
          dismiss_key: String(rawAnn?.dismiss_key ?? 'v1'),
        },
        show_menu_images:      asBool(d.show_menu_images,      true),
        delivery_fee_enabled:  asBool(d.delivery_fee_enabled,  true),
        delivery_fee_schedule: schedule,
        free_delivery_enabled: asBool(d.free_delivery_enabled, false),
        free_delivery_above:   asNum(d.free_delivery_above,    999999),
        hub_latitude:          asNum(d.hub_latitude,           31.2837165),
        hub_longitude:         asNum(d.hub_longitude,          74.847114),
        admin_preferences:     d.admin_preferences ?? { auto_reload_enabled: true, auto_reload_interval: 10 },
      });
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const s     = settings;
      const sched = s.delivery_fee_schedule ?? defaultSchedule(s.delivery_fee);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        ...s,
        app_logo_url:             normalizeMaybeMarkdownUrl(s.app_logo_url),
        support_email:            normalizeMaybeMarkdownUrl(s.support_email),
        facebook_url:             normalizeMaybeMarkdownUrl(s.facebook_url),
        instagram_url:            normalizeMaybeMarkdownUrl(s.instagram_url),
        twitter_url:              normalizeMaybeMarkdownUrl(s.twitter_url),
        youtube_url:              normalizeMaybeMarkdownUrl(s.youtube_url),
        website_url:              normalizeMaybeMarkdownUrl(s.website_url),
        delivery_fee:             Math.max(0, asNum(s.delivery_fee,            0)),
        min_order_amount:         Math.max(0, asNum(s.min_order_amount,        0)),
        tax_percentage:           Math.max(0, Math.min(100, asNum(s.tax_percentage, 0))),
        base_delivery_radius_km:  Math.max(0, asNum(s.base_delivery_radius_km, 5)),
        per_km_fee_beyond_base:   Math.max(0, asNum(s.per_km_fee_beyond_base,  10)),
        customer_search_radius_km: Math.max(1, asNum(s.customer_search_radius_km, 25)),
        custom_links: s.custom_links.map(x => ({
          ...x,
          title:    x.title.trim(),
          url:      normalizeHttpUrl(x.url.trim()),
          logo_url: normalizeMaybeMarkdownUrl(x.logo_url),
        })),
        announcement: {
          ...s.announcement,
          title:       s.announcement.title.trim(),
          message:     s.announcement.message.trim(),
          link_url:    normalizeHttpUrl(s.announcement.link_url?.trim() ?? ''),
          image_url:   normalizeMaybeMarkdownUrl(s.announcement.image_url),
          dismiss_key: s.announcement.dismiss_key.trim() || 'v1',
        },
        show_menu_images:               Boolean(s.show_menu_images),
        delivery_fee_enabled:           Boolean(s.delivery_fee_enabled),
        delivery_fee_schedule:          sched,
        delivery_fee_show_to_customer:  asBool(sched?.ui?.show_to_customer, true),
        admin_preferences:              s.admin_preferences ?? {},
      };

      const { error } = await supabase.from(TABLE).upsert(payload);
      if (error) throw error;
      setLastSaved(new Date().toLocaleTimeString());
      toast.success('✅ Settings saved!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const handleLogout = async () => { await logout(); router.push('/'); };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4 animate-pulse">
          <div className="h-32 rounded-2xl bg-gradient-to-r from-orange-200 to-pink-200" />
          <div className="h-12 rounded-2xl bg-gray-200" />
          <div className="h-96 rounded-2xl bg-gray-100" />
        </div>
      </DashboardLayout>
    );
  }

  const activeTabObj = TABS.find(t => t.id === activeTab)!;
  const hideTabSave  = activeTab === 'merchants' || activeTab === 'permissions';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">

        {/* ── Header ── */}
        <SettingsHeader
          saving={saving}
          onSave={handleSave}
          onLogout={handleLogout}
          lastSaved={lastSaved}
        />

        {/* ── Tab bar ── */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
          <div className="flex overflow-x-auto scrollbar-none">
            {TABS.map(tab => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 border-b-2 flex-shrink-0
                    ${isActive
                      ? 'border-primary text-primary bg-orange-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold leading-none">
                      {tab.badge}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-pink-500 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content panel ── */}
        <div className="bg-white rounded-b-2xl border border-t-0 border-gray-200 shadow-lg p-5 sm:p-7 min-h-[520px]">

          {/* Panel header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-100 to-yellow-50 border border-orange-200 shadow-sm">
                <span className="text-primary">{activeTabObj.icon}</span>
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">{activeTabObj.label}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{tabDescription(activeTab)}</p>
              </div>
            </div>

            {!hideTabSave && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-60 disabled:scale-100"
              >
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {saving ? 'Saving…' : 'Save'}
              </button>
            )}
          </div>

          {/* ── Tab content ── */}
          <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-3 duration-300">
            {activeTab === 'general'      && <GeneralSection      settings={settings} onChange={setSettings} />}
            {activeTab === 'delivery'     && <DeliverySection     settings={settings} onChange={setSettings} />}
            {activeTab === 'orders'       && <OrderSection        settings={settings} onChange={setSettings} />}
            {activeTab === 'announcement' && (
              <AnnouncementSection
                settings={settings}
                onChange={setSettings}
                onSave={handleSave}
              />
            )}
            {activeTab === 'social'       && <SocialSection       settings={settings} onChange={setSettings} />}
            {activeTab === 'custom'       && <CustomLinksSection  settings={settings} onChange={setSettings} />}
            {activeTab === 'performance'  && <PerformanceSection  settings={settings} onChange={setSettings} />}
            {activeTab === 'merchants'    && <MerchantControlSection />}
            {activeTab === 'permissions'  && (
              <MerchantPermissionsSection
                appSettingsId={settings.id}
                adminPreferences={settings.admin_preferences as Record<string, unknown>}
                onPreferencesChange={prefs =>
                  setSettings(s => ({ ...s, admin_preferences: prefs as Settings['admin_preferences'] }))
                }
              />
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

/* ─── Tab descriptions ────────────────────────────────── */
function tabDescription(id: TabId): string {
  const map: Record<TabId, string> = {
    general:      'App name, logo, contact info, hub location and business address',
    delivery:     'Delivery fees, area radius, per-km pricing and weekly schedule',
    orders:       'Minimum order amounts and tax configuration',
    announcement: 'Live banners, popup notifications and broadcast push messages',
    social:       'Facebook, Instagram, Twitter, YouTube and website links',
    custom:       'Custom action links shown in the customer app',
    performance:  'Image display and app performance settings',
    merchants:    'Open/close restaurants and manage merchant visibility',
    permissions:  'Control what merchants can and cannot do — globally and per-merchant',
  };
  return map[id];
}
