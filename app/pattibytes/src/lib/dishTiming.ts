// src/lib/dishTiming.ts
export interface DishTimingWindow { start: string; end: string }

export function parseDishTiming(raw: string | null | undefined): DishTimingWindow | null {
  if (!raw?.trim()) return null;
  const idx = raw.indexOf('-');
  if (idx < 1) return null;
  const start = raw.slice(0, idx).trim();
  const end   = raw.slice(idx + 1).trim();
  if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(start) || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(end)) return null;
  return { start, end };
}

function toMin(t: string): number {
  const [hh, mm] = t.split(':');
  return Number(hh || 0) * 60 + Number(mm || 0);
}

export function isDishAvailableNow(raw: string | null | undefined): boolean {
  const w = parseDishTiming(raw);
  if (!w) return true; // no timing = always available
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = toMin(w.start), e = toMin(w.end);
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // handles overnight e.g. 22:00-02:00
}

export function formatDishTiming(raw: string | null | undefined): string | null {
  const w = parseDishTiming(raw);
  if (!w) return null;
  const fmt = (t: string) => {
    const [hh, mm] = t.split(':');
    const h = Number(hh);
    return `${h % 12 || 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  return `${fmt(w.start)} – ${fmt(w.end)}`;
}

export function minutesUntilAvailable(raw: string | null | undefined): number | null {
  const w = parseDishTiming(raw);
  if (!w) return null;
  if (isDishAvailableNow(raw)) return 0;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = toMin(w.start);
  const diff = s - cur;
  return diff >= 0 ? diff : 1440 + diff; // minutes until next window open
}
