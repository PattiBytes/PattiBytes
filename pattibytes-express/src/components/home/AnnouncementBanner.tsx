'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { AnnouncementConfig } from '@/types/home';
import { isAnnouncementActive } from '@/lib/homeUtils';

type Props = { ann: AnnouncementConfig | null | undefined };

export default function AnnouncementBanner({ ann }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ann || ann.type !== 'banner' || !isAnnouncementActive(ann)) return;
    const key = `pb_ann:${ann.dismiss_key ?? 'v1'}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setOpen(!localStorage.getItem(key)); }
    catch { setOpen(true); }
  }, [ann]);

  if (!open || !ann || ann.type !== 'banner') return null;

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(`pb_ann:${ann.dismiss_key ?? 'v1'}`, '1'); } catch {}
  };

  return (
    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <p className="text-sm font-semibold truncate flex-1">
          {ann.link_url ? (
            <a href={ann.link_url} className="underline underline-offset-2 hover:opacity-90 inline-flex items-center gap-1" target="_blank" rel="noreferrer">
              {ann.message}
              <ExternalLink className="w-3.5 h-3.5 inline" />
            </a>
          ) : ann.message}
        </p>
        {ann.dismissible !== false && (
          <button
            aria-label="Dismiss"
            onClick={dismiss}
            className="shrink-0 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
