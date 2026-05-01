/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import type { AppSettingsRow, LegalPageSummary, SocialLink, SupportEmail } from '@/types/home';

type Props = {
  appName: string;
  appLogoUrl: string | null;
  settings: AppSettingsRow | null;
  supportEmail: SupportEmail;
  supportPhone: string;
  socialLinks: SocialLink[];
  legalPages: LegalPageSummary[];
  onOpenApp: () => void;
};

const LOGO_FALLBACK = '/icon-192.png';

export default function HomeFooter({
  appName,
  appLogoUrl,
  settings,
  supportEmail,
  supportPhone,
  socialLinks,
  legalPages,
  onOpenApp,
}: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* ── Brand col ── */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm shrink-0 flex items-center justify-center">
                <img
                  src={appLogoUrl || LOGO_FALLBACK}
                  alt={appName}
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.src !== `${window.location.origin}${LOGO_FALLBACK}`) {
                      img.src = LOGO_FALLBACK;
                    }
                  }}
                />
              </div>

              <div>
                <p className="text-base font-extrabold text-gray-900">{appName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Local food delivery · Patti, Punjab</p>
              </div>
            </div>

            {settings?.business_address && (
              <div className="mt-4 flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400 shrink-0" aria-hidden="true" />
                <span>{settings.business_address}</span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {supportEmail.href && (
                <a
                  href={supportEmail.href}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:shadow-sm transition text-sm font-semibold text-gray-900"
                >
                  <Mail className="w-4 h-4 text-orange-500" aria-hidden="true" />
                  {supportEmail.email}
                </a>
              )}

              {supportPhone && (
                <a
                  href={`tel:${supportPhone}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:shadow-sm transition text-sm font-semibold text-gray-900"
                >
                  <Phone className="w-4 h-4 text-orange-500" aria-hidden="true" />
                  {settings?.support_phone || supportPhone}
                </a>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socialLinks.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition overflow-hidden"
                  >
                    {s.logoUrl ? (
                      <img
                        src={s.logoUrl}
                        alt={s.label}
                        width={36}
                        height={36}
                        loading="lazy"
                        decoding="async"
                        className="w-9 h-9 object-cover"
                      />
                    ) : (
                      <s.Icon className="w-4 h-4 text-gray-700" aria-hidden="true" />
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* ── Quick links ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">App</p>
            <nav className="flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm sm:flex-col sm:space-y-2.5 sm:gap-0">
              <button
                type="button"
                onClick={onOpenApp}
                className="text-left text-gray-700 hover:text-orange-600 font-semibold transition"
              >
                Open app
              </button>
              <Link href="/auth/login" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                Sign in
              </Link>
              <Link href="/auth/signup" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                Create account
              </Link>
              <Link href="/qr" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                Install QR
              </Link>
            </nav>
          </div>

          {/* ── Legal ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Legal</p>
            <nav className="flex flex-row flex-wrap gap-x-4 gap-y-2 text-sm sm:flex-col sm:space-y-2.5 sm:gap-0">
              {legalPages.length > 0 ? (
                legalPages.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/legal/${p.slug}`}
                    className="text-gray-700 hover:text-orange-600 font-semibold transition"
                  >
                    {p.title}
                  </Link>
                ))
              ) : (
                <>
                  <Link href="/legal/terms-of-service" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                    Terms of Service
                  </Link>
                  <Link href="/legal/privacy-policy" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                    Privacy Policy
                  </Link>
                  <Link href="/legal/refund-policy" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                    Refund Policy
                  </Link>
                  <Link href="/legal/cookie-policy" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                    Cookie Policy
                  </Link>
                  <Link href="/legal/about" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                    About Us
                  </Link>
                  <Link href="/legal/contact" className="text-gray-700 hover:text-orange-600 font-semibold transition">
                    Contact
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 text-center sm:text-left">
            © {year} {appName}. All rights reserved. · Built in Patti, Punjab 🇮🇳
          </p>

          <div className="flex flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
            <Link href="/legal/privacy-policy" className="hover:text-orange-600 transition">
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/terms-of-service" className="hover:text-orange-600 transition">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/legal/refund-policy" className="hover:text-orange-600 transition">
              Refunds
            </Link>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.instagram.com/thrillyverse"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-600 transition"
            >
              Dev: Thrillyverse
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}