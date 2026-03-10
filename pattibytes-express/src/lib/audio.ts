// lib/audio.ts
const cache = new Map<string, HTMLAudioElement>();

export function playSound(src: string, volume = 0.7): void {
  if (typeof window === 'undefined') return;
  try {
    let audio = cache.get(src);
    if (!audio) {
      audio = new Audio(src);
      audio.preload = 'none'; // don't load until play() is called
      cache.set(src, audio);
    }
    audio.volume = volume;
    audio.currentTime = 0;
    // .play() returns a Promise — catch silently so missing files don't error
    audio.play().catch(() => {});
  } catch {
    // Audio API unavailable (SSR, blocked, file missing) — ignore
  }
}
