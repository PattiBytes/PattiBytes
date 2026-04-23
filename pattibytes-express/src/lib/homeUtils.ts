import { Instagram, Facebook, Youtube, Globe } from 'lucide-react';
import type { AnnouncementConfig, SupportEmail } from '@/types/home';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeArr<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeMaybeMarkdownUrl(v: any): string {
  const s0 = String(v ?? '').trim();
  if (!s0) return '';
  const md = s0.match(/\(([^)]+)\)/i);
  const picked = (md?.[1] || s0).trim();
  const bracketOnly = picked.match(/^\[([^\]]+)\]$/);
  return (bracketOnly?.[1] || picked).trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePhone(v: any): string {
  const s = String(v || '');
  const digits = s.replace(/\D/g, '');
  if (s.trim().startsWith('+')) return `+${digits}`;
  return digits;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function firstLetter(v: any): string {
  return (String(v || '').trim()[0] || 'P').toUpperCase();
}

export function iconForUrl(url: string) {
  const u = String(url || '').toLowerCase();
  if (u.includes('instagram.com')) return Instagram;
  if (u.includes('facebook.com'))  return Facebook;
  if (u.includes('youtube.com') || u.includes('youtu.be')) return Youtube;
  return Globe;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeMailtoFromSupportEmail(raw: any): SupportEmail {
  const s = String(raw ?? '').trim();
  if (!s) return { email: '', href: '' };
  const maybe = normalizeMaybeMarkdownUrl(s);
  if (!maybe) return { email: '', href: '' };
  if (maybe.toLowerCase().startsWith('mailto:')) {
    const email = maybe.replace(/^mailto:/i, '').trim();
    return { email, href: `mailto:${email}` };
  }
  if (maybe.includes('@')) return { email: maybe, href: `mailto:${maybe}` };
  return { email: maybe, href: `mailto:${maybe}` };
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(iso));
  } catch { return iso; }
}

// ── Announcement: check if active within time window ─────────────────────────
export function isAnnouncementActive(ann: AnnouncementConfig | null | undefined): boolean {
  if (!ann?.enabled) return false;
  const now = Date.now();
  if (ann.start_at && new Date(ann.start_at).getTime() > now) return false;
  if (ann.end_at   && new Date(ann.end_at).getTime()   < now) return false;
  return true;
}
