/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Instagram,
  Youtube,
  Globe,
  Facebook,
  Star,
  Send,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  safeArr,
  normalizeMaybeMarkdownUrl,
  normalizePhone,
  iconForUrl,
  safeMailtoFromSupportEmail,
} from '@/lib/homeUtils';
import type { AppSettingsRow, CustomLink, LegalPageSummary } from '@/types/home';

import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import InAppBrowserBanner from '@/components/home/InAppBrowserBanner';
import HomeFooter from '@/components/home/HomeFooter';

// ── Constants ─────────────────────────────────────────────────────────────────
const APP_SETTINGS_ID = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39';
const APP_STORE_URL =
  'https://apps.apple.com/in/app/pattibytes-express/id6761598840';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.pattibytes.express';

const APP_SETTINGS_SEL = [
  'id',
  'app_name',
  'app_logo_url',
  'support_email',
  'support_phone',
  'business_address',
  'facebook_url',
  'instagram_url',
  'twitter_url',
  'youtube_url',
  'website_url',
  'announcement',
  'custom_links',
].join(',');

// ── Types ─────────────────────────────────────────────────────────────────────
interface PublishedReview {
  id: string;
  name: string;
  rating: number;
  review: string;
  created_at: string;
}

interface Stats {
  merchants: number;
  reviews: number;
  avgRating: number;
}

// ── Supabase image transform helper ──────────────────────────────────────────
function supabaseResizeUrl(
  url: string | null | undefined,
  width: number,
  height: number,
  quality = 75,
): string | null {
  if (!url) return null;

  if (url.includes('/storage/v1/object/public/')) {
    return (
      url.replace('/storage/v1/object/public/', '/storage/v1/render/v1/public/') +
      `?width=${width}&height=${height}&quality=${quality}&resize=contain`
    );
  }

  return url;
}

// ── useCountUp ────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, trigger = true) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!trigger || target === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVal(target);
      return;
    }

    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);

      setVal(Math.round(ease * target));

      if (pct < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [target, duration, trigger]);

  return val;
}

// ── StarRow ───────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          aria-hidden="true"
          className={
            s <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-gray-100 text-gray-200'
          }
        />
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [customerLoggedOut, setCustomerLoggedOut] = useState(false);
  const [settings, setSettings] = useState<AppSettingsRow | null>(null);
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([]);
  const [legalPages, setLegalPages] = useState<LegalPageSummary[]>([]);
  const [stats, setStats] = useState<Stats>({
    merchants: 0,
    reviews: 0,
    avgRating: 0,
  });
  const [pubReviews, setPubReviews] = useState<PublishedReview[]>([]);

  const statsRef = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const cMerchants = useCountUp(stats.merchants, 1400, triggered);
  const cReviews = useCountUp(stats.reviews, 1000, triggered);

  // ── Step 1: Handle customer auto-logout ───────────────────────────────────
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const role = (user as any).role;

    if (role && role !== 'customer') {
      router.replace(`/${role}/dashboard`);
      return;
    }

    if (role === 'customer') {
      supabase.auth.signOut().catch(() => {});
      setCustomerLoggedOut(true);
    }
  }, [user, loading, router]);

  // ── Step 2: Load data ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select(APP_SETTINGS_SEL)
          .eq('id', APP_SETTINGS_ID)
          .single();

        if (error) throw error;

        const row = data as unknown as AppSettingsRow;
        setSettings(row);

        const links: CustomLink[] = safeArr<any>(row.custom_links)
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
        // silent
      }
    };

    const loadStats = async () => {
      try {
        const [{ count: mc }, { data: rv }] = await Promise.all([
          supabase
            .from('merchants')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('app_reviews')
            .select('rating')
            .eq('is_published', true),
        ]);

        const rCount = rv?.length || 0;
        const avg = rCount
          ? rv!.reduce((sum, item) => sum + item.rating, 0) / rCount
          : 0;

        setStats({
          merchants: mc || 0,
          reviews: rCount,
          avgRating: avg,
        });
      } catch {
        // silent
      }
    };

    const loadReviews = async () => {
      try {
        const { data } = await supabase
          .from('app_reviews')
          .select('id,name,rating,review,created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3);

        setPubReviews((data || []) as PublishedReview[]);
      } catch {
        // silent
      }
    };

    const loadLegal = async () => {
      try {
        const { data } = await supabase
          .from('legal_pages')
          .select('slug,title')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        setLegalPages((data || []) as LegalPageSummary[]);
      } catch {
        setLegalPages([]);
      }
    };

    loadSettings();
    loadStats();
    loadReviews();
    loadLegal();
  }, []);

  // ── Step 3: Trigger count-up when stats section scrolls into view ─────────
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const appName = settings?.app_name || 'PattiBytes Express';
  const appLogoUrl = settings?.app_logo_url ?? null;
  const appLogoSrc = useMemo(
    () => supabaseResizeUrl(appLogoUrl, 80, 80, 75),
    [appLogoUrl],
  );

  const supportEmail = useMemo(
    () => safeMailtoFromSupportEmail(settings?.support_email),
    [settings?.support_email],
  );

  const supportPhone = useMemo(
    () => normalizePhone(settings?.support_phone),
    [settings?.support_phone],
  );

  const socialLinks = useMemo(() => {
    const base = [
      {
        label: 'Instagram',
        href: normalizeMaybeMarkdownUrl(settings?.instagram_url),
        Icon: Instagram,
      },
      {
        label: 'YouTube',
        href: normalizeMaybeMarkdownUrl(settings?.youtube_url),
        Icon: Youtube,
      },
      {
        label: 'Website',
        href: normalizeMaybeMarkdownUrl(settings?.website_url),
        Icon: Globe,
      },
      {
        label: 'Facebook',
        href: normalizeMaybeMarkdownUrl(settings?.facebook_url),
        Icon: Facebook,
      },
    ].filter((x) => !!x.href);

    const extra = customLinks.map((x) => ({
      label: x.title || 'Link',
      href: x.url,
      Icon: iconForUrl(x.url),
      logoUrl: x.logo_url || '',
    }));

    return [...base, ...extra].slice(0, 8);
  }, [settings, customLinks]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-orange-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-pink-50 flex flex-col">
      <InAppBrowserBanner />
      <AnnouncementBanner ann={settings?.announcement ?? null} />

      {customerLoggedOut && (
        <div className="bg-blue-600 text-white text-center px-4 py-3 text-sm font-medium">
          You&apos;ve been signed out — PattiBytes Express is available on the
          mobile apps below. 📱
        </div>
      )}

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24">
        {appLogoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appLogoSrc}
            alt={appName}
            width={80}
            height={80}
            className="w-20 h-20 rounded-2xl object-contain mb-5 shadow-md"
            loading="eager"
            decoding="async"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.src.endsWith('/icon-192.png')) {
                img.src = '/icon-192.png';
              }
            }}
          />
        ) : (
          <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center mb-5 shadow-md">
            <ShoppingBag size={36} className="text-white" />
          </div>
        )}

        <span className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">
          ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
        </span>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-3">
          {appName}
        </h1>

        <p className="text-gray-500 text-base sm:text-lg max-w-sm mb-8 leading-relaxed">
          Order food &amp; groceries from local shops in Patti — delivered fast.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black text-white px-5 py-3.5 rounded-2xl hover:bg-gray-800 transition-colors shadow-md w-48 justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 shrink-0"
              aria-hidden="true"
            >
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <div className="text-left">
              <p className="text-[10px] leading-none opacity-80">
                Download on the
              </p>
              <p className="text-sm font-semibold leading-tight">App Store</p>
            </div>
          </a>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-black text-white px-5 py-3.5 rounded-2xl hover:bg-gray-800 transition-colors shadow-md w-48 justify-center"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6 shrink-0"
              aria-hidden="true"
            >
              <path d="M3.18 23.76c.3.16.65.18.97.07l11.65-6.73-2.6-2.6-10.02 9.26zM.35 1.56C.13 1.9 0 2.33 0 2.86v18.28c0 .53.14.97.36 1.3l.07.07 10.24-10.24v-.24L.42 1.49l-.07.07zM20.8 9.98l-2.95-1.7-2.92 2.92 2.92 2.92 2.97-1.72c.84-.49.84-1.93-.02-2.42zM3.18.24l10.65 10.64-2.6 2.6L.35.31C.66.19 1.01.22 1.34.4l1.84 1.06L3.18.24z" />
            </svg>
            <div className="text-left">
              <p className="text-[10px] leading-none opacity-80">Get it on</p>
              <p className="text-sm font-semibold leading-tight">
                Google Play
              </p>
            </div>
          </a>
        </div>

        <Link
          href="/auth/login"
          className="text-sm text-gray-400 hover:text-orange-500 transition-colors underline underline-offset-2"
        >
          Staff / Merchant login →
        </Link>
      </section>

      <section ref={statsRef} className="bg-white border-y border-gray-100 py-8 px-4">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-orange-500 tabular-nums leading-none">
              {cMerchants > 0 ? `${cMerchants}+` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Local Shops</p>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-orange-500 tabular-nums leading-none">
              {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Avg Rating</p>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-orange-500 tabular-nums leading-none">
              {cReviews > 0 ? `${cReviews}+` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-medium">Reviews</p>
          </div>
        </div>
      </section>

      <section className="py-12 px-4 max-w-3xl mx-auto w-full">
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-6 mb-8 text-center text-white shadow-lg">
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={18}
                className="fill-white text-white"
                aria-hidden="true"
              />
            ))}
          </div>

          <h2 className="text-xl font-bold mb-1">Love PattiBytes Express?</h2>

          <p className="text-orange-100 text-sm mb-4">
            Share your experience — it takes 30 seconds and helps our local
            business community.
          </p>

          <Link
            href="/review"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-sm shadow-sm"
          >
            <Send size={15} /> Write a Review
          </Link>
        </div>

        {pubReviews.length > 0 && (
          <>
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star
                size={16}
                className="fill-yellow-400 text-yellow-400"
                aria-hidden="true"
              />
              What customers are saying
            </h3>

            <div className="space-y-3">
              {pubReviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                      {r.name[0]?.toUpperCase() || '?'}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {r.name}
                      </p>
                      <StarRow rating={r.rating} size={12} />
                    </div>

                    <span className="ml-auto text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed">
                    &quot;{r.review}&quot;
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mt-5">
              <Link
                href="/review"
                className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
              >
                See all reviews →
              </Link>
            </div>
          </>
        )}
      </section>

      <HomeFooter
        appName={appName}
        appLogoUrl={appLogoSrc}
        settings={settings}
        supportEmail={supportEmail}
        supportPhone={supportPhone}
        socialLinks={socialLinks}
        legalPages={legalPages}
        onOpenApp={() => router.push('/auth/login')}
      />
    </div>
  );
}