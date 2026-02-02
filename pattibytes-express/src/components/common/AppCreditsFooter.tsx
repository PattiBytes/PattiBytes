'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Facebook, Instagram, Youtube, Twitter, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type SettingsMap = Record<string, string>;

const socialDefaults = {
  instagram: 'https://instagram.com/',
  facebook: 'https://facebook.com/',
  youtube: 'https://youtube.com/',
  x: 'https://x.com/',
};

export default function AppCreditsFooter() {
  const [settings, setSettings] = useState<SettingsMap>({});

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('key,value')
          .in('key', [
            'sponsor_name',
            'sponsor_url',
            'thrillyverse_name',
            'thrillyverse_url',
            'social_instagram',
            'social_facebook',
            'social_youtube',
            'social_x',
          ]);

        const map: SettingsMap = {};
        (data || []).forEach((r: any) => {
          map[String(r.key)] = String(r.value || '');
        });
        setSettings(map);
      } catch {
        setSettings({});
      }
    };

    load();
  }, []);

  const sponsorName = settings.sponsor_name || 'Pattibytes';
  const sponsorUrl = settings.sponsor_url || 'https://pattibytes.com';

  const devName = settings.thrillyverse_name || 'Thrillyverse';
  const devUrl = settings.thrillyverse_url || 'https://thrillyverse.com';

  const socials = [
    { href: settings.social_instagram || socialDefaults.instagram, label: 'Instagram', Icon: Instagram },
    { href: settings.social_facebook || socialDefaults.facebook, label: 'Facebook', Icon: Facebook },
    { href: settings.social_youtube || socialDefaults.youtube, label: 'YouTube', Icon: Youtube },
    { href: settings.social_x || socialDefaults.x, label: 'X', Icon: Twitter },
  ];

  return (
    <div className="mt-6">
      <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm px-4 py-4 sm:px-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-700 leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-gray-900">Sponsored by</span>
              <Link href={sponsorUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">
                {sponsorName}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <span className="font-semibold text-gray-900">Developed with</span>
              <span className="inline-flex items-center gap-1">
                <Heart className="w-4 h-4 text-pink-600 fill-pink-600" />
              </span>
              <span className="font-semibold text-gray-900">by</span>
              <Link href={devUrl} target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">
                {devName}
              </Link>
              <span className="text-gray-400">❤️</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {socials.map(({ href, label, Icon }) => (
              <Link
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                title={label}
                className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-primary/40 hover:shadow transition"
              >
                <Icon className="w-4 h-4 text-gray-700" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 mt-2 px-1">
        Tip: If anything looks cut off on mobile, check your browser zoom and enable “Display zoom: Default”.
      </p>
    </div>
  );
}
