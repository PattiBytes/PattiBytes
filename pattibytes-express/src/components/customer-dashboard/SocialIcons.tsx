'use client';

import Link from 'next/link';
import { Facebook, Instagram, Youtube, Twitter } from 'lucide-react';

const social = [
  { href: 'https://instagram.com/', label: 'Instagram', Icon: Instagram },
  { href: 'https://facebook.com/', label: 'Facebook', Icon: Facebook },
  { href: 'https://youtube.com/', label: 'YouTube', Icon: Youtube },
  { href: 'https://x.com/', label: 'X', Icon: Twitter },
];

export default function SocialIcons() {
  return (
    <div className="flex items-center gap-2">
      {social.map(({ href, label, Icon }) => (
        <Link
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="p-2 rounded-lg bg-white border border-gray-100 shadow-sm hover:border-primary/40 hover:shadow transition"
        >
          <Icon className="w-4 h-4 text-gray-700" />
        </Link>
      ))}
    </div>
  );
}
