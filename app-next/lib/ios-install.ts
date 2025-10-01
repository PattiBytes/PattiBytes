export const isStandalone = (): boolean =>
  // PWA display-mode check (all modern browsers)
  window.matchMedia?.('(display-mode: standalone)').matches ||
  // iOS legacy PWA check (defined by our ambient type)
  navigator.standalone === true;

export const isiOS = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window);
