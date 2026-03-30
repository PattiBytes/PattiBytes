'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, ExternalLink } from 'lucide-react';
import type { AnnouncementConfig } from '@/types/home';
import { isAnnouncementActive } from '@/lib/homeUtils';

type Props = { ann: AnnouncementConfig | null | undefined };

export default function AnnouncementPopup({ ann }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ann || ann.type !== 'popup' || !isAnnouncementActive(ann)) return;
    const key = `pb_ann:${ann.dismiss_key ?? 'v1'}`;
    try {
      if (!localStorage.getItem(key)) {
        // Small delay so page loads before popup appears
        const t = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(t);
      }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    } catch { setOpen(true); }
  }, [ann]);

  if (!open || !ann || ann.type !== 'popup') return null;

  const dismiss = () => {
    setOpen(false);
    if (ann.dismissible !== false) {
      try { localStorage.setItem(`pb_ann:${ann.dismiss_key ?? 'v1'}`, '1'); } catch {}
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && ann.dismissible !== false) dismiss(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">

        {/* Dismiss button */}
        {ann.dismissible !== false && (
          <button
            onClick={dismiss}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 p-1.5 rounded-xl bg-black/10 hover:bg-black/20 transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Image */}
        {ann.image_url ? (
          <div className="relative w-full h-44 bg-gray-100">
            <Image src={ann.image_url} alt={ann.title || 'Announcement'} fill className="object-cover" />
          </div>
        ) : (
          <div className="h-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
        )}

        <div className="p-6">
          {ann.title && (
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">{ann.title}</h3>
          )}
          <p className="text-gray-700 text-sm leading-relaxed">{ann.message}</p>

          <div className="mt-5 flex gap-3">
            {ann.link_url && (
              <a
                href={ann.link_url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-5 py-3 rounded-xl font-bold text-sm hover:shadow-lg transition"
                onClick={dismiss}
              >
                Open <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {ann.dismissible !== false && (
              <button
                onClick={dismiss}
                className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}