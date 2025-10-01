// /app-next/types/pwa.d.ts
// iOS Safari exposes `navigator.standalone` (boolean) when running as a PWA.
interface Navigator {
  standalone?: boolean;
}
// Some older platforms expose `MSStream` on Window.
interface Window {
  MSStream?: unknown;
}
