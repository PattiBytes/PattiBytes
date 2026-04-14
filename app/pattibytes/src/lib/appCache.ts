// src/lib/appCache.ts
// Lightweight in-memory TTL cache shared across the JS lifecycle.
// Not persisted — cleared on app restart. Perfect for short-lived API data.

type CacheEntry<T> = { data: T; expiresAt: number }

class AppCache {
  private store = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): T | null {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }
}

export const appCache = new AppCache()

/** Pre-defined TTL constants (milliseconds) */
export const TTL = {
  MERCHANT_GEO:  15 * 60 * 1000,  // 15 min  – lat/lng rarely changes
  PROMOS:         2 * 60 * 1000,  //  2 min  – deals change frequently
  OFFERS:         2 * 60 * 1000,  //  2 min  – offers list
  ADDRESSES:      5 * 60 * 1000,  //  5 min  – user addresses
  APP_SETTINGS:  10 * 60 * 1000,  // 10 min  – rarely changes
  TRENDING:      10 * 60 * 1000,  // 10 min  – trending dishes
} as const