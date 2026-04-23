'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

type Props = {
  text: string;
  href?: string;
  version?: string;
  enabled?: boolean;
};

export default function AnnouncementBar({ text, href, version = 'v1', enabled = true }: Props) {
  const key = `pb_announcement_dismissed:${version}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !text) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setOpen(!localStorage.getItem(key)); }
    catch { setOpen(true); }
  }, [key, enabled, text]);

  if (!open || !text || !enabled) return null;

  return (
    <div className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <p className="text-sm font-semibold truncate flex-1">
          {href ? (
            <a href={href} className="underline underline-offset-2 hover:opacity-90" target="_blank" rel="noreferrer">
              {text}
            </a>
          ) : text}
        </p>
        <button
          aria-label="Dismiss announcement"
          className="shrink-0 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition"
          onClick={() => {
            setOpen(false);
            try { localStorage.setItem(key, new Date().toISOString()); } catch {}
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
