import { supabase } from '../lib/supabase'
import { PATTI_HUB } from './location'

export type DeliveryPolicy = {
  enabled: boolean; show_to_customer: boolean
  base_fee: number; base_radius_km: number; per_km_fee_beyond_base: number
}

let _cachedPolicy: DeliveryPolicy | null = null

export async function getDeliveryPolicy(forceRefresh = false): Promise<DeliveryPolicy> {
  if (_cachedPolicy && !forceRefresh) return _cachedPolicy
  const { data } = await supabase
    .from('app_settings')
    .select('delivery_fee,delivery_fee_enabled,delivery_fee_show_to_customer,base_delivery_radius_km,per_km_fee_beyond_base,delivery_fee_schedule')
    .limit(1).maybeSingle()
  const dayNames = ['sun','mon','tue','wed','thu','fri','sat']
  const today = dayNames[new Date().getDay()]
  const weeklyFee = (data?.delivery_fee_schedule as any)?.weekly?.[today]?.fee
  _cachedPolicy = {
    enabled:               data?.delivery_fee_enabled        ?? true,
    show_to_customer:      data?.delivery_fee_show_to_customer ?? true,
    base_fee:              weeklyFee ?? data?.delivery_fee   ?? 35,
    base_radius_km:        data?.base_delivery_radius_km     ?? 3,
    per_km_fee_beyond_base: data?.per_km_fee_beyond_base     ?? 15,
  }
  return _cachedPolicy
}

export function calcFee(distanceKm: number, policy: DeliveryPolicy): number {
  if (!policy.enabled) return 0
  if (distanceKm <= policy.base_radius_km) return policy.base_fee
  return Math.ceil(policy.base_fee + (distanceKm - policy.base_radius_km) * policy.per_km_fee_beyond_base)
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371, toRad = (d: number) => d * Math.PI / 180
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function getRoadKm(
  lon1: number, lat1: number,
  lon2: number, lat2: number,
  key: string
): Promise<number> {
  const res  = await fetch(
    `https://us1.locationiq.com/v1/directions/driving/${lon1},${lat1};${lon2},${lat2}?key=${key}&overview=false`,
    { signal: AbortSignal.timeout(8000) }
  )
  const json = await res.json()
  const meters = json?.routes?.[0]?.distance
  if (!meters) throw new Error('no route')
  return meters / 1000
}

/**
 * ✅ Correct flow:
 *   Restaurant orders → Hub(Patti) → Merchant → Customer  (full chain)
 *   Custom/Store orders → Hub(Patti) → Customer
 *
 * Distance shown to customer is ONLY merchant → customer (the last leg),
 * but fee is calculated on the relevant leg distance for fairness.
 */
export async function calcDeliveryForAddresses(
  merchantLat: number, merchantLng: number,
  customerLat: number, customerLng: number,
  isStoreOrder = false
): Promise<{ fee: number; distanceKm: number; breakdown: string }> {
  const policy = await getDeliveryPolicy()
  const key    = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY

  // ── Merchant → Customer leg (always needed for display) ─────────────────
  let merchantToCustomerKm: number
  try {
    if (!key) throw new Error('no key')
    merchantToCustomerKm = await getRoadKm(merchantLng, merchantLat, customerLng, customerLat, key)
  } catch {
    merchantToCustomerKm = haversine(merchantLat, merchantLng, customerLat, customerLng)
  }

  if (isStoreOrder) {
    // Store: Hub → Customer only
    let hubToCustomerKm: number
    try {
      if (!key) throw new Error('no key')
      hubToCustomerKm = await getRoadKm(PATTI_HUB.lng, PATTI_HUB.lat, customerLng, customerLat, key)
    } catch {
      hubToCustomerKm = haversine(PATTI_HUB.lat, PATTI_HUB.lng, customerLat, customerLng)
    }
    const km = Math.round(hubToCustomerKm * 10) / 10
    return {
      fee:        calcFee(km, policy),
      distanceKm: km,
      breakdown:  `${km.toFixed(1)} km (Patti → You)`,
    }
  }

  // Restaurant: fee based on merchant → customer (last leg only)
  const km = Math.round(merchantToCustomerKm * 10) / 10
  return {
    fee:        calcFee(km, policy),
    distanceKm: km,
    breakdown:  `${km.toFixed(1)} km`,
  }
}
