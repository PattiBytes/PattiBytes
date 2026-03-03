import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppSettings } from '../components/cart/types'
import { PATTI_HUB } from '../services/location'

// ─── Safe defaults (matches current app_settings row) ─────────────────────────
export const DEFAULT_APP_SETTINGS: AppSettings = {
  delivery_fee_enabled:          true,
  delivery_fee_show_to_customer: true,
  base_delivery_radius_km:       3,
  per_km_fee_beyond_base:        15,
  base_delivery_fee:             35,
  per_km_rate:                   15,
  free_delivery_above:           999,
  min_order_amount:              null,
  tax_percentage:                0,
  hub_latitude:                  PATTI_HUB.lat,
  hub_longitude:                 PATTI_HUB.lng,
  delivery_fee_schedule:         null,
}

// ─── Columns to select (must match AppSettings interface) ─────────────────────
const SELECT_COLS =
  'delivery_fee_enabled,' +
  'delivery_fee_show_to_customer,' +
  'base_delivery_radius_km,' +
  'per_km_fee_beyond_base,' +
  'base_delivery_fee,' +
  'per_km_rate,' +
  'free_delivery_above,' +
  'min_order_amount,' +
  'tax_percentage,' +
  'hub_latitude,' +
  'hub_longitude,' +
  'delivery_fee_schedule'

// ─── Helper: safely parse a number field ──────────────────────────────────────
function n(val: unknown, fallback: number): number {
  const parsed = Number(val)
  return Number.isFinite(parsed) ? parsed : fallback
}

// ─── Helper: safely parse a nullable number field ─────────────────────────────
function nn(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const parsed = Number(val)
  return Number.isFinite(parsed) ? parsed : null
}

// ─── Parse raw Supabase row → AppSettings ─────────────────────────────────────
// Using explicit field access instead of spread to avoid GenericStringError
function parseRow(raw: Record<string, unknown>): AppSettings {
  return {
    delivery_fee_enabled:          raw.delivery_fee_enabled !== false,
    delivery_fee_show_to_customer: raw.delivery_fee_show_to_customer !== false,
    base_delivery_radius_km:       n(raw.base_delivery_radius_km, DEFAULT_APP_SETTINGS.base_delivery_radius_km),
    per_km_fee_beyond_base:        n(raw.per_km_fee_beyond_base,  DEFAULT_APP_SETTINGS.per_km_fee_beyond_base),
    base_delivery_fee:             n(raw.base_delivery_fee,       DEFAULT_APP_SETTINGS.base_delivery_fee),
    per_km_rate:                   n(raw.per_km_rate,             DEFAULT_APP_SETTINGS.per_km_rate),
    free_delivery_above:           nn(raw.free_delivery_above),
    min_order_amount:              nn(raw.min_order_amount),
    tax_percentage:                n(raw.tax_percentage, 0),
    hub_latitude:                  nn(raw.hub_latitude)  ?? PATTI_HUB.lat,
    hub_longitude:                 nn(raw.hub_longitude) ?? PATTI_HUB.lng,
    delivery_fee_schedule:         (raw.delivery_fee_schedule as any) ?? null,
  }
}

// ─── Module-level cache (avoids repeated DB calls per render) ─────────────────
let _cache: AppSettings | null = null
let _cacheAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000   // 5 minutes

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseAppSettingsReturn {
  settings: AppSettings
  loading:  boolean
  error:    string | null
  refresh:  () => Promise<void>
}

export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(_cache ?? DEFAULT_APP_SETTINGS)
  const [loading,  setLoading]  = useState(!_cache)
  const [error,    setError]    = useState<string | null>(null)

  const fetch = useCallback(async (force = false) => {
    // Return from cache if fresh
    if (_cache && !force && Date.now() - _cacheAt < CACHE_TTL_MS) {
      setSettings(_cache)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('app_settings')
        .select(SELECT_COLS)
        .limit(1)
        .maybeSingle()

      if (err) throw err

      // ✅ Cast to Record to avoid GenericStringError spread issue
      const raw = data as Record<string, unknown> | null

      if (raw && typeof raw === 'object') {
        const parsed = parseRow(raw)
        _cache   = parsed
        _cacheAt = Date.now()
        setSettings(parsed)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load app settings'
      setError(msg)
      console.warn('[useAppSettings]', msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { settings, loading, error, refresh: () => fetch(true) }
}

// ─── Standalone async getter (for non-hook contexts like services) ────────────
export async function getAppSettings(): Promise<AppSettings> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL_MS) return _cache

  const { data, error } = await supabase
    .from('app_settings')
    .select(SELECT_COLS)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('[getAppSettings]', error.message)
    return DEFAULT_APP_SETTINGS
  }

  const raw = data as Record<string, unknown> | null
  if (!raw) return DEFAULT_APP_SETTINGS

  const parsed = parseRow(raw)
  _cache   = parsed
  _cacheAt = Date.now()
  return parsed
}

// ─── Delivery fee calculator (uses AppSettings) ───────────────────────────────
export function calcDeliveryFeeFromSettings(
  distKm: number,
  settings: AppSettings,
): { fee: number; breakdown: string } {
  if (!settings.delivery_fee_enabled) return { fee: 0, breakdown: 'Delivery fee disabled' }

  const BASE_KM  = settings.base_delivery_radius_km
  const BASE_FEE = settings.base_delivery_fee
  const PER_KM   = settings.per_km_fee_beyond_base

  // Free delivery threshold check
  if (settings.free_delivery_above && distKm <= BASE_KM) {
    return { fee: BASE_FEE, breakdown: `Base ₹${BASE_FEE} (within ${BASE_KM} km)` }
  }

  if (distKm <= BASE_KM) {
    return { fee: BASE_FEE, breakdown: `Base ₹${BASE_FEE} (within ${BASE_KM} km)` }
  }

  const extra = Math.ceil((distKm - BASE_KM) * PER_KM)
  return {
    fee:       BASE_FEE + extra,
    breakdown: `₹${BASE_FEE} + ₹${extra} (${(distKm - BASE_KM).toFixed(1)} km × ₹${PER_KM}/km)`,
  }
}
