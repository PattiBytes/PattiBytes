'use client';

import { ChevronRight, Mail, Phone, BadgeCheck } from 'lucide-react';
import type { NormalizedPartner, SupportEmail } from '@/types/home';
import { firstLetter } from '@/lib/homeUtils';

type Props = {
  partners: NormalizedPartner[];
  rawCount: number;
  partnersLoading: boolean;
  supportEmail: SupportEmail;
  supportPhone: string;
  supportPhoneDisplay: string;
  onOpenApp: () => void;
};

export default function PartnersSection({
  partners,
  rawCount,
  partnersLoading,
  supportEmail,
  supportPhone,
  supportPhoneDisplay,
  onOpenApp,
}: Props) {
  // Duplicate for seamless CSS marquee
  const track = [...partners, ...partners];

  return (
    <section className="relative py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">

        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Our partners</h2>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">
              Live from your database — local merchants powering every delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenApp}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition"
          >
            Open app <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header bar */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">
              {partnersLoading
                ? 'Loading partners…'
                : `${rawCount} merchant partner${rawCount !== 1 ? 's' : ''}`}
            </p>
            <span className="text-xs text-gray-500 bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full font-semibold">
              ● Live
            </span>
          </div>

          {/* Marquee */}
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white to-transparent z-10" />

            <div className="marquee-wrap py-5">
              <div className="marquee-track">
                {track.map((m, idx) => {
                  const tel  = m.phone ? `tel:${m.phone}` : '';
                  const mail = m.email
                    ? (m.email.toLowerCase().startsWith('mailto:') ? m.email : `mailto:${m.email}`)
                    : '';

                  return (
                    <div key={`${m.id}-${idx}`} className="shrink-0">
                      <div className="group w-[220px] sm:w-[240px] rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
                        <div className="p-4 flex items-start gap-3">
                          {/* Logo */}
                          <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                            {m.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.logo} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-extrabold text-gray-500">{firstLetter(m.name)}</span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <p className="text-sm font-extrabold text-gray-900 truncate">{m.name}</p>
                              {m.verified && (
                                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {m.type || 'Merchant'}
                              {m.locationLine ? ` · ${m.locationLine}` : ''}
                            </p>

                            {/* Hover actions */}
                            <div className="mt-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {tel && (
                                <a
                                  href={tel}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100 px-2 py-1 rounded-lg hover:bg-orange-100 transition"
                                >
                                  <Phone className="w-3 h-3" /> Call
                                </a>
                              )}
                              {mail && (
                                <a
                                  href={mail}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
                                >
                                  <Mail className="w-3 h-3" /> Email
                                </a>
                              )}
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

          {/* Partner CTA */}
          <div className="px-5 pb-5">
            <div className="rounded-2xl bg-gradient-to-r from-orange-50 via-pink-50 to-purple-50 border border-gray-100 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-gray-900">Want to partner with us?</p>
                <p className="text-xs text-gray-600 mt-0.5">We&apos;ll onboard your restaurant or cafe.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {supportEmail.href && (
                  <a
                    href={supportEmail.href}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition text-sm font-semibold"
                  >
                    <Mail className="w-4 h-4 text-orange-600" /> Email us
                  </a>
                )}
                {supportPhone && (
                  <a
                    href={`tel:${supportPhone}`}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900 text-white hover:bg-black transition text-sm font-semibold"
                  >
                    <Phone className="w-4 h-4" /> {supportPhoneDisplay}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-wrap { overflow: hidden; }
        .marquee-track {
          display: flex;
          gap: 12px;
          padding: 0 12px;
          width: max-content;
          animation: scroll-marquee 30s linear infinite;
        }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        @keyframes scroll-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; }
        }
      `}</style>
    </section>
  );
}