import { supabase } from '../lib/supabase'

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
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const today = dayNames[new Date().getDay()]
  const weeklyFee = (data?.delivery_fee_schedule as any)?.weekly?.[today]?.fee
  _cachedPolicy = {
    enabled: data?.delivery_fee_enabled ?? true,
    show_to_customer: data?.delivery_fee_show_to_customer ?? true,
    base_fee: weeklyFee ?? data?.delivery_fee ?? 35,
    base_radius_km: data?.base_delivery_radius_km ?? 3,
    per_km_fee_beyond_base: data?.per_km_fee_beyond_base ?? 15,
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

export async function calcDeliveryForAddresses(
  merchantLat: number, merchantLng: number,
  customerLat: number, customerLng: number
): Promise<{ fee: number; distanceKm: number; breakdown: string }> {
  const policy = await getDeliveryPolicy()
  const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY
  try {
    if (!key) throw new Error('no key')
    const res = await fetch(
      `https://us1.locationiq.com/v1/directions/driving/${merchantLng},${merchantLat};${customerLng},${customerLat}?key=${key}&overview=false`,
      { signal: AbortSignal.timeout(10000) }
    )
    const json = await res.json()
    const km = (json?.routes?.[0]?.distance ?? 0) / 1000
    if (!km) throw new Error('no route')
    return { fee: calcFee(km, policy), distanceKm: Math.round(km * 10) / 10, breakdown: `${km.toFixed(1)} km road` }
  } catch {
    const km = haversine(merchantLat, merchantLng, customerLat, customerLng)
    return { fee: calcFee(km, policy), distanceKm: Math.round(km * 10) / 10, breakdown: `${km.toFixed(1)} km aerial` }
  }
}
