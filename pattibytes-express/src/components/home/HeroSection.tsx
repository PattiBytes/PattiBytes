'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Download, Mail, Phone, MapPin } from 'lucide-react';
import type { AppSettingsRow, SupportEmail } from '@/types/home';

type Props = {
  appName: string;
  appLogoUrl: string | null;
  tagline: string | null;
  isStandalone: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any | null;
  settings: AppSettingsRow | null;
  supportEmail: SupportEmail;
  supportPhone: string;
  onInstallClick: () => void;
  onContinueToApp: () => void;
};

export default function HeroSection({
  appName,
  appLogoUrl,
  tagline,
  isStandalone,
  user,
  settings,
  supportEmail,
  supportPhone,
  onInstallClick,
  onContinueToApp,
}: Props) {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-orange-300/35 to-pink-300/25 blur-3xl" />
        <div className="absolute -bottom-52 -left-40 w-[640px] h-[640px] rounded-full bg-gradient-to-br from-purple-300/25 to-orange-300/25 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 sm:pt-20 sm:pb-14 relative">
        <div className="text-center mt-10 sm:mt-12">

          {/* App logo from DB */}
          <div className="flex justify-center mb-6">
            {appLogoUrl ? (
              <div className="relative w-20 h-20 rounded-3xl overflow-hidden shadow-xl border border-white/60">
                <Image src={appLogoUrl} alt={appName} fill sizes="80px" className="object-cover" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center shadow-xl">
                <span className="text-3xl">🍕</span>
              </div>
            )}
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {appName}
            <span className="block bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mt-1">
              ਪੱਟੀ ਦੀ ਲੋੜ, ਹਾਢੇ ਕੋਲ ਤੋੜ
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 mt-5 max-w-2xl mx-auto">
            {tagline || 'Fresh food, trusted partners, and a smooth mobile-first experience built for Patti.'}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-9">
            {!isStandalone && (
              <button
                onClick={onInstallClick}
                className="group w-full sm:w-auto bg-gradient-to-r from-orange-500 to-pink-500 text-white px-7 py-4 rounded-2xl font-bold text-base sm:text-lg shadow-lg hover:shadow-2xl transition-all flex items-center justify-center gap-3"
              >
                <Download size={22} />
                Install App
                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {user ? (
              <button
                onClick={onContinueToApp}
                className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-200 px-7 py-4 rounded-2xl font-bold text-base sm:text-lg hover:border-orange-300 hover:bg-orange-50 transition flex items-center justify-center gap-3"
              >
                Continue to App <ChevronRight size={20} />
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="w-full sm:w-auto bg-white text-gray-900 border-2 border-gray-200 px-7 py-4 rounded-2xl font-bold text-base sm:text-lg hover:border-orange-300 hover:bg-orange-50 transition inline-flex items-center justify-center gap-3"
                >
                  Sign In <ChevronRight size={20} />
                </Link>
                <Link
                  href="/auth/signup"
                  className="w-full sm:w-auto bg-gray-900 text-white px-7 py-4 rounded-2xl font-bold text-base sm:text-lg hover:bg-black transition inline-flex items-center justify-center gap-3"
                >
                  Sign Up Free <ChevronRight size={20} />
                </Link>
              </>
            )}
          </div>

          {/* ✅ Policy disclaimer — Apple Guideline 5.1.1 + Google Play requirement */}
          <p className="mt-4 text-xs text-gray-500 max-w-sm mx-auto">
            By continuing, you agree to our{' '}
            <Link href="/legal/terms-of-service" className="text-orange-600 font-semibold hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy-policy" className="text-orange-600 font-semibold hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          {/* Support strip */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-gray-700">
            {supportEmail.href && (
              <a
                href={supportEmail.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <Mail className="w-4 h-4 text-orange-600" />
                <span className="font-semibold">{supportEmail.email}</span>
              </a>
            )}
            {supportPhone && (
              <a
                href={`tel:${supportPhone}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition"
              >
                <Phone className="w-4 h-4 text-orange-600" />
                <span className="font-semibold">{settings?.support_phone || supportPhone}</span>
              </a>
            )}
            {settings?.business_address && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-gray-200">
                <MapPin className="w-4 h-4 text-gray-600" />
                <span className="truncate max-w-[260px]">{settings.business_address}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}