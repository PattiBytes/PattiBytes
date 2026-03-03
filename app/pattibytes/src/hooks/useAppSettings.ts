import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppSettings } from '../components/cart/types'
import { PATTI_HUB } from '../services/location'

// ─── Safe defaults (matches current app_settings row) ─────────────────────────
// In DEFAULT_APP_SETTINGS — change business_address to null (it's nullable now)
export const DEFAULT_APP_SETTINGS: AppSettings = {
  delivery_fee_enabled:           true,
  delivery_fee_show_to_customer:  true,
  base_delivery_radius_km:        3,
  per_km_fee_beyond_base:         15,
  base_delivery_fee:              35,
  per_km_rate:                    15,
  free_delivery_above:            999,
  min_order_amount:               null,
  tax_percentage:                 0,
  hub_latitude:                   PATTI_HUB.lat,
  hub_longitude:                  PATTI_HUB.lng,
  delivery_fee_schedule:          null,
  // Identity
  app_name:                       'PattiBytes Express',
  support_phone:                  '+918400009045',
  support_email:                  'pbexpress38@gmail.com',  // keep as string or null ✅
  business_address:               'Patti, Punjab, India',   // string | null ✅
  app_logo_url:                   null,
  // Social
  facebook_url:                   null,
  instagram_url:                  null,
  twitter_url:                    null,
  youtube_url:                    null,
  website_url:                    null,
  custom_links:                   null,
  // Discovery
  customer_search_radius_km:      25,
  // Announcement
  announcement:                   null,                     // ✅ now valid
  // Display
  show_menu_images:               true,
}


// ─── Columns to select ────────────────────────────────────────────────────────
const SELECT_COLS = [
  'delivery_fee_enabled',
  'delivery_fee_show_to_customer',
  'base_delivery_radius_km',
  'per_km_fee_beyond_base',
  'base_delivery_fee',
  'per_km_rate',
  'free_delivery_above',
  'min_order_amount',
  'tax_percentage',
  'hub_latitude',
  'hub_longitude',
  'delivery_fee_schedule',
  // identity
  'app_name',
  'support_phone',
  'support_email',
  'business_address',
  'app_logo_url',
  // social
  'facebook_url',
  'instagram_url',
  'twitter_url',
  'youtube_url',
  'website_url',
  'custom_links',
  // discovery
  'customer_search_radius_km',
  // announcement
  'announcement',
  // display
  'show_menu_images',
].join(',')

// ─── Helpers ──────────────────────────────────────────────────────────────────
function n(val: unknown, fallback: number): number {
  const parsed = Number(val)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nn(val: unknown): number | null {
  if (val === null || val === undefined) return null
  const parsed = Number(val)
  return Number.isFinite(parsed) ? parsed : null
}

function str(val: unknown, fallback: string): string {
  return typeof val === 'string' && val.length > 0 ? val : fallback
}

function strOrNull(val: unknown): string | null {
  return typeof val === 'string' && val.length > 0 ? val : null
}

function bool(val: unknown, fallback: boolean): boolean {
  if (typeof val === 'boolean') return val
  return fallback
}

// ─── Parse raw Supabase row → AppSettings ─────────────────────────────────────
function parseRow(raw: Record<string, unknown>): AppSettings {
  return {
    // Delivery
    delivery_fee_enabled:           bool(raw.delivery_fee_enabled, true),
    delivery_fee_show_to_customer:  bool(raw.delivery_fee_show_to_customer, true),
    base_delivery_radius_km:        n(raw.base_delivery_radius_km,  DEFAULT_APP_SETTINGS.base_delivery_radius_km),
    per_km_fee_beyond_base:         n(raw.per_km_fee_beyond_base,   DEFAULT_APP_SETTINGS.per_km_fee_beyond_base),
    base_delivery_fee:              n(raw.base_delivery_fee,        DEFAULT_APP_SETTINGS.base_delivery_fee),
    per_km_rate:                    n(raw.per_km_rate,              DEFAULT_APP_SETTINGS.per_km_rate),
    free_delivery_above:            nn(raw.free_delivery_above),
    min_order_amount:               nn(raw.min_order_amount),
    tax_percentage:                 n(raw.tax_percentage, 0),
    hub_latitude:                   nn(raw.hub_latitude)  ?? PATTI_HUB.lat,
    hub_longitude:                  nn(raw.hub_longitude) ?? PATTI_HUB.lng,
    delivery_fee_schedule:          (raw.delivery_fee_schedule as any) ?? null,

    // Identity
    app_name:                       str(raw.app_name, DEFAULT_APP_SETTINGS.app_name),
    support_phone:                  strOrNull(raw.support_phone),
    support_email:                  strOrNull(raw.support_email),
    business_address:               strOrNull(raw.business_address),
    app_logo_url:                   strOrNull(raw.app_logo_url),

    // Social
    facebook_url:                   strOrNull(raw.facebook_url),
    instagram_url:                  strOrNull(raw.instagram_url),
    twitter_url:                    strOrNull(raw.twitter_url),
    youtube_url:                    strOrNull(raw.youtube_url),
    website_url:                    strOrNull(raw.website_url),
    custom_links:                   Array.isArray(raw.custom_links) ? raw.custom_links : null,

    // Discovery
    customer_search_radius_km:      nn(raw.customer_search_radius_km),

    // Announcement
    announcement: raw.announcement && typeof raw.announcement === 'object'
      ? raw.announcement as AppSettings['announcement']
      : null,

    // Display
    show_menu_images:               bool(raw.show_menu_images, true),
  }
}

// ─── Module-level cache ───────────────────────────────────────────────────────
let _cache:    AppSettings | null = null
let _cacheAt:  number             = 0
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

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

  const fetchSettings = useCallback(async (force = false) => {
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

  useEffect(() => { fetchSettings() }, [fetchSettings])

  return { settings, loading, error, refresh: () => fetchSettings(true) }
}

// ─── Standalone async getter (for non-hook contexts) ─────────────────────────
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

// ─── Delivery fee calculator ──────────────────────────────────────────────────
export function calcDeliveryFeeFromSettings(
  distKm: number,
  settings: AppSettings,
): { fee: number; breakdown: string } {
  if (!settings.delivery_fee_enabled) {
    return { fee: 0, breakdown: 'Delivery fee disabled' }
  }

  const BASE_KM  = settings.base_delivery_radius_km
  const BASE_FEE = settings.base_delivery_fee
  const PER_KM   = settings.per_km_fee_beyond_base

  // Free delivery threshold
  if (settings.free_delivery_above !== null && distKm <= settings.free_delivery_above) {
    return { fee: 0, breakdown: `Free delivery (under ₹${settings.free_delivery_above})` }
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

// ─── Support URL helpers ──────────────────────────────────────────────────────
export function getSupportWhatsApp(settings: AppSettings, orderNumber?: number): string {
  const phone = (settings.support_phone ?? '+918400009045').replace(/\D/g, '')
  const msg   = orderNumber
    ? `Hi! I need help with order %23${orderNumber}`
    : 'Hi! I need some help.'
  return `https://wa.me/${phone}?text=${msg}`
}

export function getSupportPhone(settings: AppSettings): string {
  return settings.support_phone ?? '+918400009045'
}
