export function nNum(v: unknown, fallback = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

export function round2(v: unknown): number {
  return Math.round(nNum(v, 0) * 100) / 100;
}

export function toINR(v: unknown): string {
  const n = nNum(v, 0);
  try {
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  } catch {
    return '₹' + round2(n);
  }
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function generateCustomRef(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return 'PBX-CUST-' + Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export const IC = 'w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm ' +
                  'focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-white';
