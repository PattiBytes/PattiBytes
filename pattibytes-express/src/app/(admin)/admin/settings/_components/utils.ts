import type { DayKey, DeliveryFeeSchedule, Announcement } from './types';

export const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Mon' }, { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' }, { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' }, { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Math.random().toString(16).slice(2)}${Date.now()}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asNum = (v: any, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asBool = (v: any, fallback = false): boolean => {
  if (v == null) return fallback;
  return Boolean(v);
};

export function normalizeMaybeMarkdownUrl(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const m = s.match(/https?:\/\/[^\s)]+/i);
  return m?.[0] ?? s.trim();
}

export function normalizeHttpUrl(v: string): string {
  const s = normalizeMaybeMarkdownUrl(v);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

export function toIsoOrEmpty(v: string): string {
  const s = String(v).trim();
  if (!s) return '';
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : '';
}

export function toDatetimeLocal(iso?: string): string {
  const s = String(iso ?? '').trim();
  if (!s) return '';
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultAnnouncement(): Announcement {
  return { enabled: false, type: 'banner', title: '', message: '', image_url: '', link_url: '', start_at: '', end_at: '', dismissible: true, dismiss_key: 'v1' };
}

export function defaultSchedule(fee = 40): DeliveryFeeSchedule {
  const day = { enabled: true, fee };
  return {
    timezone: 'Asia/Kolkata',
    weekly: { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: { enabled: false, fee: 0 } },
    overrides: [],
    ui: { show_to_customer: true },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSchedule(v: any, fallbackFee: number): DeliveryFeeSchedule {
  try {
    if (!v) return defaultSchedule(fallbackFee);
    const obj = typeof v === 'string' ? JSON.parse(v) : v;
    const base = defaultSchedule(fallbackFee);
    const weekly = { ...base.weekly, ...(obj?.weekly ?? {}) };
    for (const key of Object.keys(weekly) as DayKey[]) {
      weekly[key] = { enabled: asBool(weekly[key]?.enabled, true), fee: Math.max(0, asNum(weekly[key]?.fee, fallbackFee)) };
    }
    return {
      timezone: String(obj?.timezone ?? base.timezone),
      weekly,
      overrides: Array.isArray(obj?.overrides) ? obj.overrides : [],
      ui: { ...base.ui, ...(obj?.ui ?? {}) },
    };
  } catch {
    return defaultSchedule(fallbackFee);
  }
}

export function dayKeyForNow(timezone: string): DayKey {
  const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(new Date());
  const k = short.toLowerCase().slice(0, 3);
  const valid: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return valid.includes(k as DayKey) ? (k as DayKey) : 'mon';
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error('Cloudinary env vars missing');
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? 'Cloudinary upload failed');
  return json.secure_url as string;
}