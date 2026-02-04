export function extractUrl(raw?: string | null) {
  if (!raw) return null;
  const s = String(raw).trim();

  // Handles markdown-like: [text](https://...)
  const md = s.match(/\((https?:\/\/[^)]+)\)/);
  if (md?.[1]) return md[1];

  // Handles plain URL
  if (s.startsWith('http://') || s.startsWith('https://')) return s;

  return null;
}

export function isDirectImageUrl(url: string) {
  // Very practical check: ends with common image extension
  return /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(url.split('?')[0]);
}

export function isBlockedNonImagePage(url: string) {
  // Specifically block google search pages like your sample
  try {
    const u = new URL(url);
    return u.hostname.includes('google.') && u.pathname.startsWith('/search');
  } catch {
    return true;
  }
}

export function getSafeImageSrc(raw?: string | null) {
  const url = extractUrl(raw);
  if (!url) return null;
  if (isBlockedNonImagePage(url)) return null;
  if (!isDirectImageUrl(url)) return null; // require real image file URL
  return url;
}
