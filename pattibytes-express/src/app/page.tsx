/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

 

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShoppingBag,
  Truck,
  Store,
  ChevronRight,
  Download,
  Smartphone,
  Monitor,
  Apple,
  Mail,
  Phone,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Youtube,
  ExternalLink,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

type Platform = 'ios' | 'android' | 'desktop';

type CustomLink = {
  id: string;
  title: string;
  url: string;
  logo_url?: string | null;
  enabled?: boolean;
};

type AppSettingsRow = {
  id: string;
  app_name: string | null;
  support_email: string | null;
  support_phone: string | null;
  business_address: string | null;

  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  website_url: string | null;

  custom_links?: any;
};

type PartnerMerchant = {
  id: string;
  user_id?: string | null;
  business_name: string | null;
  business_type: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  city?: string | null;
  state?: string | null;
};

const APP_SETTINGS_ID = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';

function safeArr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

function normalizeMaybeMarkdownUrl(v: any) {
  const s0 = String(v ?? '').trim();
  if (!s0) return '';
  // [text](https://x) OR [email](mailto:x)
  const md = s0.match(/\(([^)]+)\)/i);
  const picked = (md?.[1] || s0).trim();
  // [https://x](https://x) (brackets only)
  const bracketOnly = picked.match(/^\[([^\]]+)\]$/);
  return (bracketOnly?.[1] || picked).trim();
}

function normalizePhone(v: any) {
  const s = String(v || '');
  const digits = s.replace(/\D/g, '');
  if (s.trim().startsWith('+')) return `+${digits}`;
  return digits;
}

function firstLetter(v: any) {
  const s = String(v || '').trim();
  return (s[0] || 'P').toUpperCase();
}


function iconForUrl(url: string) {
  const u = String(url || '').toLowerCase();
  if (u.includes('instagram.com')) return Instagram;
  if (u.includes('facebook.com')) return Facebook;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return Youtube;
  return Globe;
}

function safeMailtoFromSupportEmail(raw: any) {
  const s = String(raw ?? '').trim();
  if (!s) return { email: '', href: '' };

  const maybe = normalizeMaybeMarkdownUrl(s); // may become "mailto:xxx" or "xxx@gmail.com"
  if (!maybe) return { email: '', href: '' };

  if (maybe.toLowerCase().startsWith('mailto:')) {
    const email = maybe.replace(/^mailto:/i, '').trim();
    return { email, href: `mailto:${email}` };
  }

  // sometimes stored as plain email
  if (maybe.includes('@')) return { email: maybe, href: `mailto:${maybe}` };

  return { email: maybe, href: `mailto:${maybe}` };
}
 
function AnnouncementBar({
  text,
  href,
  version = 'v1',
}: { text: string; href?: string; version?: string }) {
  const key = `pb_announcement_dismissed:${version}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    }
  }, [key]);

  if (!open || !text) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <p className="text-sm font-semibold truncate flex-1">
          {href ? (
            <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
              {text}
            </a>
          ) : (
            text
          )}
        </p>
        <button
          className="text-xs font-bold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-xl"
          onClick={() => {
            setOpen(false);
            try { localStorage.setItem(key, new Date().toISOString()); } catch {}
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}


export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isStandalone, setIsStandalone] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');

  const [settings, setSettings] = useState<AppSettingsRow | null>(null);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);

  const [partners, setPartners] = useState<PartnerMerchant[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setPlatform('ios');
    else if (/android/.test(userAgent)) setPlatform('android');
    else setPlatform('desktop');

    if (standalone && user && !loading) {
      router.push(`/${(user as any).role}/dashboard`);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [user, loading, router]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select(
            'id,app_name,support_email,support_phone,business_address,facebook_url,instagram_url,twitter_url,youtube_url,website_url,custom_links'
          )
          .eq('id', APP_SETTINGS_ID)
          .single();

        if (error) throw error;

        const row = data as AppSettingsRow;
        setSettings(row);

        const links = safeArr<any>((row as any).custom_links)
          .map((x) => ({
            id: String(x?.id || ''),
            title: String(x?.title || ''),
            url: normalizeMaybeMarkdownUrl(x?.url || ''),
            logo_url: normalizeMaybeMarkdownUrl(x?.logo_url || ''),
            enabled: Boolean(x?.enabled ?? true),
          }))
          .filter((x) => x.enabled !== false && !!x.url);

        setCustomLinks(links);
      } catch {
        // keep silent fallback UI
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
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;

        const rows = (data || []) as PartnerMerchant[];
        setPartners(rows);
      } catch {
        setPartners([]);
      } finally {
        setPartnersLoading(false);
      }
    };

    loadSettings();
    loadPartners();
  }, []);

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
    if (user) router.push(`/${(user as any).role}/dashboard`);
    else router.push('/auth/login');
  };

  const appName = settings?.app_name || 'PattiBytes Express';

  const supportEmail = useMemo(() => safeMailtoFromSupportEmail(settings?.support_email), [settings?.support_email]);
  const supportPhone = useMemo(() => normalizePhone(settings?.support_phone), [settings?.support_phone]);

  const socialLinks = useMemo(() => {
    const base = [
      { label: 'Instagram', href: normalizeMaybeMarkdownUrl(settings?.instagram_url), Icon: Instagram },
      { label: 'YouTube', href: normalizeMaybeMarkdownUrl(settings?.youtube_url), Icon: Youtube },
      { label: 'Website', href: normalizeMaybeMarkdownUrl(settings?.website_url), Icon: Globe },
      { label: 'Facebook', href: normalizeMaybeMarkdownUrl(settings?.facebook_url), Icon: Facebook },
    ].filter((x) => !!x.href);

    const extra = (customLinks || []).map((x) => ({
      label: x.title || 'Link',
      href: x.url,
      Icon: iconForUrl(x.url),
      logoUrl: x.logo_url || '',
    }));

    return [...base, ...extra].slice(0, 8);
  }, [settings, customLinks]);

  const partnerItems = useMemo(() => {
    const cleaned = (partners || [])
      .filter((m) => !!m.business_name)
      .map((m) => ({
        id: String(m.id),
        name: String(m.business_name || 'Partner'),
        type: String(m.business_type || ''),
        logo: normalizeMaybeMarkdownUrl(m.logo_url),
        phone: normalizePhone(m.phone),
        email: normalizeMaybeMarkdownUrl(m.email),
        verified: Boolean(m.is_verified),
        locationLine: [m.city, m.state].filter(Boolean).join(', '),
      }));

    // Make the marquee always look “full”
    const min = 12;
    if (cleaned.length >= min) return cleaned;
    const fill = Array.from({ length: Math.max(0, min - cleaned.length) }).map((_, i) => cleaned[i % Math.max(1, cleaned.length)]);
    return cleaned.length ? [...cleaned, ...fill] : [];
  }, [partners]);

  const marqueeA = partnerItems;
  const marqueeB = partnerItems; // duplicated for seamless loop

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex flex-col">
      <AnnouncementBar
  text="We Are Starting Trials Soon — scan QR to install Or Share the QR!"
  href="/qr"
  version="2026-02-06"
/>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-orange-300/35 to-pink-300/25 blur-3xl" />
          <div className="absolute -bottom-52 -left-40 w-[640px] h-[640px] rounded-full bg-gradient-to-br from-purple-300/25 to-orange-300/25 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 sm:pt-20 sm:pb-14 relative">
          {/* Top bar */}
        
          {/* Main hero */}
          <div className="text-center mt-12 sm:mt-14">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight">
             Pattibytes Express
               <span className="block bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">    

                
               </span>
              <span className="block bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mt-5 max-w-2xl mx-auto">
              Fresh food, trusted partners, and a smooth mobile-first experience built for Patti.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-9">
              {!isStandalone && (
                <button
                  onClick={handleInstallClick}
                  className="group w-full sm:w-auto bg-gradient-to-r from-orange-500 to-pink-500 text-white px-7 py-4 rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition flex items-center justify-center gap-3"
                >
                  <Download size={22} />
                  Install App
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              {user ? (
                <button
                  onClick={handleContinueToApp}
                  className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-200 px-7 py-4 rounded-2xl font-bold text-base sm:text-lg hover:border-orange-300 hover:bg-orange-50 transition flex items-center justify-center gap-3"
                >
                  Continue to App
                  <ChevronRight />
                </button>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-200 px-7 py-4 rounded-2xl font-bold text-base sm:text-lg hover:border-orange-300 hover:bg-orange-50 transition inline-flex items-center justify-center gap-3"
                  >
                    Sign In
                    <ChevronRight />
                  </Link>

                  <Link
                    href="/auth/signup"
                    className="w-full sm:w-auto bg-gray-900 text-white px-7 py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-black transition inline-flex items-center justify-center gap-3"
                  >
                    Sign Up
                    <ChevronRight />
                  </Link>
                </>
              )}
            </div>

            {/* Support mini strip */}
            <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-700">
              {supportEmail.href ? (
                <a
                  href={supportEmail.href}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition"
                >
                  <Mail className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold">{supportEmail.email}</span>
                </a>
              ) : null}

              {supportPhone ? (
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition"
                >
                  <Phone className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold">{settings?.support_phone || supportPhone}</span>
                </a>
              ) : null}

              {settings?.business_address ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-gray-200">
                  <MapPin className="w-4 h-4 text-gray-600" />
                  <span className="truncate max-w-[280px]">{settings.business_address}</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 mt-14 sm:mt-16">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center mb-4">
                <ShoppingBag className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Order easily</h3>
              <p className="text-gray-600 mt-1">Browse menus and place orders in seconds on mobile.</p>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
                <Truck className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Fast delivery</h3>
              <p className="text-gray-600 mt-1">Reliable delivery partners, with quick handoff and tracking.</p>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center mb-4">
                <Store className="text-white" size={24} />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Support local</h3>
              <p className="text-gray-600 mt-1">Every order supports restaurants and cafes in your city.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PARTNERS / COLLABORATORS */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
          <div className="flex items-end justify-between gap-4 mb-5">
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Our partners</h2>
              <p className="text-gray-600 mt-1">
                Collaborating with local merchants to deliver great food—scrolling live from your database.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push(user ? `/${(user as any).role}/dashboard` : '/auth/login')}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black transition"
            >
              Open app
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-b border-gray-100">
              <p className="text-sm font-bold text-gray-900">
                {partnersLoading ? 'Loading partners…' : `${partners.length} merchant partners`}
              </p>
            
            </div>

            {/* marquee */}
            <div className="relative">
              {/* subtle fades */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white to-transparent z-10" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white to-transparent z-10" />

              <div className="marquee py-4">
                <div className="marquee__track">
                  {[...marqueeA, ...marqueeB].map((m, idx) => {
                    const hasLogo = !!m.logo;
                    const tel = m.phone ? `tel:${m.phone}` : '';
                    const mail = m.email
                      ? (m.email.toLowerCase().startsWith('mailto:') ? m.email : `mailto:${m.email}`)
                      : '';

                    return (
                      <div key={`${m.id}-${idx}`} className="marquee__item">
                        <div className="group w-[220px] sm:w-[240px] rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
                          <div className="p-4 flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                              {hasLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={m.logo} alt={m.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-extrabold text-gray-600">{firstLetter(m.name)}</span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-gray-900 truncate">{m.name}</p>
                              <p className="text-xs text-gray-600 truncate">
                                {m.type || 'Merchant'}
                                {m.locationLine ? ` • ${m.locationLine}` : ''}
                              </p>

                              <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                {tel ? (
                                  <a
                                    href={tel}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg"
                                    title="Call"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    Call
                                  </a>
                                ) : null}

                                {mail ? (
                                  <a
                                    href={mail}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg"
                                    title="Email"
                                  >
                                    <Mail className="w-3.5 h-3.5" />
                                    Email
                                  </a>
                                ) : null}

                                <span className="ml-auto text-[11px] font-bold text-gray-500">
                                  {m.verified ? 'Verified' : 'Partner'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-5 pb-4">
              <div className="rounded-2xl bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 border border-gray-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-gray-900">Want to partner with us?</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Reach out and we’ll onboard your restaurant/cafe.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {supportEmail.href ? (
                    <a
                      href={supportEmail.href}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition text-sm font-semibold"
                    >
                      <Mail className="w-4 h-4 text-orange-600" />
                      Email us
                      <ExternalLink className="w-4 h-4 text-gray-500" />
                    </a>
                  ) : null}

                  {supportPhone ? (
                    <a
                      href={`tel:${supportPhone}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition text-sm font-semibold"
                    >
                      <Phone className="w-4 h-4" />
                      Call support
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .marquee {
            overflow: hidden;
          }
          .marquee__track {
            display: flex;
            gap: 12px;
            width: max-content;
            padding: 0 12px;
            animation: marquee 28s linear infinite;
          }
          .marquee:hover .marquee__track {
            animation-play-state: paused;
          }
          .marquee__item {
            flex: 0 0 auto;
          }
          @keyframes marquee {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-50%);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .marquee__track {
              animation: none;
            }
          }
        `}</style>
      </section>

      {/* INSTALL INSTRUCTIONS MODAL */}
      {showInstallInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-7 shadow-2xl">
            <div className="text-center mb-5">
              {platform === 'ios' && <Apple size={44} className="mx-auto text-gray-700 mb-3" />}
              {platform === 'android' && <Smartphone size={44} className="mx-auto text-green-600 mb-3" />}
              {platform === 'desktop' && <Monitor size={44} className="mx-auto text-blue-600 mb-3" />}

              <h3 className="text-2xl font-extrabold text-gray-900">Install {appName}</h3>
              <p className="text-sm text-gray-600 mt-1">Add it to your home screen for a faster experience.</p>
            </div>

            <div className="text-left space-y-4 text-gray-700 text-sm">
              {platform === 'ios' && (
                <>
                  <p className="font-semibold">On iPhone/iPad (Safari):</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Tap the Share button</li>
                    <li>Tap “Add to Home Screen”</li>
                    <li>Tap “Add”</li>
                    <li>Open the app from your home screen</li>
                  </ol>
                </>
              )}

              {platform === 'android' && (
                <>
                  <p className="font-semibold">On Android (Chrome):</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Tap the menu (⋮)</li>
                    <li>Select “Install app” / “Add to Home screen”</li>
                    <li>Confirm install</li>
                    <li>Open from your home screen</li>
                  </ol>
                </>
              )}

              {platform === 'desktop' && (
                <>
                  <p className="font-semibold">On Desktop (Chrome/Edge):</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Look for the install icon in the address bar</li>
                    <li>Click “Install”</li>
                    <li>Or Menu (⋮) → “Install”</li>
                    <li>Launch from desktop/taskbar</li>
                  </ol>
                </>
              )}
            </div>

            <button
              onClick={() => setShowInstallInstructions(false)}
              className="w-full mt-6 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-2xl bg-white border border-gray-200 overflow-hidden">
                  <Image src="/icon-192.png" alt={appName} fill sizes="40px" className="object-contain p-1" />
                </div>
                <div>
                  <p className="text-base font-extrabold text-gray-900">{appName}</p>
                  <p className="text-sm text-gray-600">Local food delivery • Patti, Punjab</p>
                </div>
              </div>

              {settings?.business_address ? (
                <div className="mt-4 flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 mt-0.5 text-gray-600" />
                  <span>{settings.business_address}</span>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {supportEmail.href ? (
                  <a
                    href={supportEmail.href}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:shadow-sm transition text-sm font-semibold text-gray-900"
                  >
                    <Mail className="w-4 h-4 text-orange-600" />
                    {supportEmail.email}
                  </a>
                ) : null}

                {supportPhone ? (
                  <a
                    href={`tel:${supportPhone}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:shadow-sm transition text-sm font-semibold text-gray-900"
                  >
                    <Phone className="w-4 h-4 text-orange-600" />
                    {settings?.support_phone || supportPhone}
                  </a>
                ) : null}
              </div>
            </div>

            <div>
              <p className="text-sm font-extrabold text-gray-900">Quick links</p>
              <div className="mt-3 space-y-2 text-sm">
                <button
                  type="button"
                  onClick={handleContinueToApp}
                  className="text-left w-full text-gray-700 hover:text-orange-600 font-semibold transition"
                >
                  Open app
                </button>
                <Link href="/auth/login" className="block text-gray-700 hover:text-orange-600 font-semibold transition">
                  Sign in
                </Link>
                <Link href="/auth/signup" className="block text-gray-700 hover:text-orange-600 font-semibold transition">
                  Create account
                </Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-extrabold text-gray-900">Follow</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {socialLinks.map((s: any) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition overflow-hidden"
                    aria-label={s.label}
                    title={s.label}
                  >
                    {s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logoUrl} alt={s.label} className="w-10 h-10 object-cover" />
                    ) : (
                      <s.Icon className="w-5 h-5 text-gray-800" />
                    )}
                  </a>
                ))}
              </div>

              <p className="mt-5 text-xs text-gray-500">
                Developed by{' '}
                <a
                  href="https://www.instagram.com/thrillyverse"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-gray-700 hover:text-orange-600"
                >
                  Thrillyverse
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">© {new Date().getFullYear()} {appName}. All rights reserved.</p>
            <p className="text-xs text-gray-500">Built as a Webapp for fast installs and smooth performance. Full App Soon</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
