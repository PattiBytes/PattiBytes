export function isValidHttpUrl(v: string) {
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}
export function isDataImageUrl(v: string) {
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(v || '').trim());
}
export function isValidImageSource(v: string) {
  return !v || isValidHttpUrl(v) || isDataImageUrl(v);
}
export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function extFromMime(mime: string) {
  const m = mime.toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('webp')) return 'webp';
  if (m.includes('gif')) return 'gif';
  return 'jpg';
}
export function dataUrlToFile(dataUrl: string, base = 'pasted-image') {
  const match = dataUrl.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  const [, mime, b64] = match;
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new File([bytes], `${base}.${extFromMime(mime)}`, { type: mime });
}
export async function copyText(text: string) {
  if (!text) return;
  if (navigator?.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text); return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  Object.assign(ta.style, { position: 'fixed', left: '-9999px', top: '-9999px' });
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

