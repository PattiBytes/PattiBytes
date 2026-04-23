/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Instagram, Youtube, Globe, Facebook } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  safeArr, normalizeMaybeMarkdownUrl, normalizePhone,
  iconForUrl, safeMailtoFromSupportEmail,
} from '@/lib/homeUtils';
import type {
  Platform, AppSettingsRow, CustomLink,
  PartnerMerchant, NormalizedPartner, LegalPageSummary,
} from '@/types/home';

import AnnouncementBanner  from '@/components/home/AnnouncementBanner';   // ✅ CHANGED
import AnnouncementPopup   from '@/components/home/AnnouncementPopup';    // ✅ NEW
import InAppBrowserBanner  from '@/components/home/InAppBrowserBanner';   // ✅ NEW
import HeroSection         from '@/components/home/HeroSection';
import FeatureCards        from '@/components/home/FeatureCards';
import PartnersSection     from '@/components/home/PartnersSection';
import InstallModal        from '@/components/home/InstallModal';
import HomeFooter          from '@/components/home/HomeFooter';

const APP_SETTINGS_ID = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';
const MIN_PARTNER_FILL = 12;

// ✅ CHANGED: exact columns from your table
const APP_SETTINGS_SELECT = [
  'id', 'app_name', 'app_logo_url', 'support_email', 'support_phone', 'business_address',
  'facebook_url', 'instagram_url', 'twitter_url', 'youtube_url', 'website_url',
  'delivery_fee', 'base_delivery_fee', 'min_order_amount', 'tax_percentage',
  'free_delivery_above', 'free_delivery_enabled', 'delivery_fee_enabled',
  'delivery_fee_show_to_customer', 'delivery_fee_schedule',
  'base_delivery_radius_km', 'per_km_fee_beyond_base', 'per_km_rate',
  'customer_search_radius_km', 'hub_latitude', 'hub_longitude',
  'show_menu_images', 'announcement', 'admin_preferences', 'custom_links',
].join(',');

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isStandalone,            setIsStandalone]            = useState(false);
  const [installPrompt,           setInstallPrompt]           = useState<any>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [platform,                setPlatform]                = useState<Platform>('desktop');

  const [settings,        setSettings]        = useState<AppSettingsRow | null>(null);
  const [customLinks,     setCustomLinks]      = useState<CustomLink[]>([]);
  const [partners,        setPartners]         = useState<PartnerMerchant[]>([]);
  const [legalPages,      setLegalPages]       = useState<LegalPageSummary[]>([]);
  const [partnersLoading, setPartnersLoading]  = useState(true);

  // ── PWA / device detection ────────────────────────────────────────────────
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    if      (/iphone|ipad|ipod/.test(ua)) setPlatform('ios');
    else if (/android/.test(ua))           setPlatform('android');
    else                                   setPlatform('desktop');

    if (standalone && user && !loading) {
      router.push(`/${(user as any).role}/dashboard`);
      return;
    }

    const onPrompt = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [user, loading, router]);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select(APP_SETTINGS_SELECT)       // ✅ CHANGED
          .eq('id', APP_SETTINGS_ID)
          .single();
        if (error) throw error;

        const row = data as unknown as AppSettingsRow;
        setSettings(row);

        const links: CustomLink[] = safeArr<any>(row.custom_links)
          .map((x) => ({
            id:       String(x?.id    || ''),
            title:    String(x?.title || ''),
            url:      normalizeMaybeMarkdownUrl(x?.url      || ''),
            logo_url: normalizeMaybeMarkdownUrl(x?.logo_url || ''),
            enabled:  Boolean(x?.enabled ?? true),
          }))
          .filter((x) => x.enabled !== false && !!x.url);
        setCustomLinks(links);
      } catch {
        // silent fallback
      }
    };

    const loadPartners = async () => {
      setPartnersLoading(true);
      try {
        const { data, error } = await supabase
          .from('merchants')
          .select('id,user_id,business_name,business_type,logo_url,phone,email,is_active,is_verified,city,state')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('created_at',  { ascending: false })
          .limit(200);
        if (error) throw error;
        setPartners((data || []) as PartnerMerchant[]);
      } catch { setPartners([]); }
      finally  { setPartnersLoading(false); }
    };

    const loadLegalPages = async () => {
      try {
        const { data } = await supabase
          .from('legal_pages')
          .select('slug,title')
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        setLegalPages((data || []) as LegalPageSummary[]);
      } catch { setLegalPages([]); }
    };

    loadSettings();
    loadPartners();
    loadLegalPages();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userResult;
      if (outcome === 'accepted') setInstallPrompt(null);
    } else {
      setShowInstallInstructions(true);
    }
  };

  const handleContinueToApp = () => {
    router.push(user ? `/${(user as any).role}/dashboard` : '/auth/login');
  };

  // ── Derived values ────────────────────────────────────────────────────────
  const appName    = settings?.app_name    || 'PattiBytes Express';
  const appLogoUrl = settings?.app_logo_url ?? null;
  const tagline    = null; // not in your table — hardcoded below or remove

  const supportEmail = useMemo(() => safeMailtoFromSupportEmail(settings?.support_email), [settings?.support_email]);
  const supportPhone = useMemo(() => normalizePhone(settings?.support_phone),             [settings?.support_phone]);

  const socialLinks = useMemo(() => {
    const base = [
      { label: 'Instagram', href: normalizeMaybeMarkdownUrl(settings?.instagram_url), Icon: Instagram },
      { label: 'YouTube',   href: normalizeMaybeMarkdownUrl(settings?.youtube_url),   Icon: Youtube   },
      { label: 'Website',   href: normalizeMaybeMarkdownUrl(settings?.website_url),   Icon: Globe     },
      { label: 'Facebook',  href: normalizeMaybeMarkdownUrl(settings?.facebook_url),  Icon: Facebook  },
    ].filter((x) => !!x.href);

    const extra = customLinks.map((x) => ({
      label:   x.title || 'Link',
      href:    x.url,
      Icon:    iconForUrl(x.url),
      logoUrl: x.logo_url || '',
    }));

    return [...base, ...extra].slice(0, 8);
  }, [settings, customLinks]);

  const partnerItems = useMemo<NormalizedPartner[]>(() => {
    const cleaned = partners
      .filter((m) => !!m.business_name)
      .map((m) => ({
        id:           String(m.id),
        name:         String(m.business_name || 'Partner'),
        type:         String(m.business_type || ''),
        logo:         normalizeMaybeMarkdownUrl(m.logo_url),
        phone:        normalizePhone(m.phone),
        email:        normalizeMaybeMarkdownUrl(m.email),
        verified:     Boolean(m.is_verified),
        locationLine: [m.city, m.state].filter(Boolean).join(', '),
      }));

    if (cleaned.length >= MIN_PARTNER_FILL) return cleaned;
    const fill = Array.from({ length: MIN_PARTNER_FILL - cleaned.length })
      .map((_, i) => cleaned[i % Math.max(1, cleaned.length)]);
    return cleaned.length ? [...cleaned, ...fill] : [];
  }, [partners]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex flex-col">

      {/* ✅ NEW: In-app browser detection — client only, no SSR needed */}
      <InAppBrowserBanner />

      {/* ✅ CHANGED: Announcement driven by `announcement` JSONB column */}
      {/* Banner type = top strip */}
      <AnnouncementBanner ann={settings?.announcement ?? null} />

      <HeroSection
        appName={appName}
        appLogoUrl={appLogoUrl}
        tagline={tagline}
        isStandalone={isStandalone}
        user={user}
        settings={settings}
        supportEmail={supportEmail}
        supportPhone={supportPhone}
        onInstallClick={handleInstallClick}
        onContinueToApp={handleContinueToApp}
      />

      <FeatureCards />

      <PartnersSection
        partners={partnerItems}
        rawCount={partners.length}
        partnersLoading={partnersLoading}
        supportEmail={supportEmail}
        supportPhone={supportPhone}
        supportPhoneDisplay={settings?.support_phone || supportPhone}
        onOpenApp={handleContinueToApp}
      />

      {showInstallInstructions && (
        <InstallModal
          platform={platform}
          appName={appName}
          onClose={() => setShowInstallInstructions(false)}
        />
      )}

      {/* ✅ NEW: Popup type announcement modal */}
      <AnnouncementPopup ann={settings?.announcement ?? null} />

      <HomeFooter
        appName={appName}
        appLogoUrl={appLogoUrl}
        settings={settings}
        supportEmail={supportEmail}
        supportPhone={supportPhone}
        socialLinks={socialLinks}
        legalPages={legalPages}
        onOpenApp={handleContinueToApp}
      />
    </div>
  );
}
