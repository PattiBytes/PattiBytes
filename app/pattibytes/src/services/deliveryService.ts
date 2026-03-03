/**
 * Delivery fee rules (confirmed with PBExpress):
 *
 *  Restaurant orders:
 *    Fee distance = Hub(Patti) → Merchant + Merchant → Customer  (full chain)
 *    Shown to customer = Merchant → Customer only
 *
 *  Store / Custom orders:
 *    Fee distance = Hub(Patti) → Customer
 *    Shown to customer = same
 */
import { supabase } from '../lib/supabase'
import { PATTI_HUB, getRoadDistanceKm, haversineKm } from './location'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DeliveryPolicy {
  enabled:              boolean
  show_to_customer:     boolean
  base_fee:             number
  base_radius_km:       number
  per_km_beyond:        number
  free_delivery_above:  number | null
}

export interface DeliveryResult {
  fee:                   number
  /** Distance shown to customer (restaurant→customer for restaurants) */
  displayDistanceKm:     number
  /** Full chain distance used for fee calculation */
  feeDistanceKm:         number
  breakdown:             string
  legHubToMerchant:      number
  legMerchantToCustomer: number
  isFreeDelivery:        boolean
}

// ─── Policy cache (5 min TTL) ─────────────────────────────────────────────────
let _policy:   DeliveryPolicy | null = null
let _policyAt: number = 0
const POLICY_TTL = 5 * 60 * 1000

export async function getDeliveryPolicy(forceRefresh = false): Promise<DeliveryPolicy> {
  if (_policy && !forceRefresh && Date.now() - _policyAt < POLICY_TTL) return _policy

  const { data } = await supabase
    .from('app_settings')
    .select(
      'delivery_fee_enabled,delivery_fee_show_to_customer,' +
      'base_delivery_radius_km,per_km_fee_beyond_base,' +
      'delivery_fee_schedule,base_delivery_fee,per_km_rate,' +
      'free_delivery_above'
    )
    .limit(1)
    .maybeSingle()

  const raw = data as Record<string, any> | null

  // Use today's scheduled fee if set, else fall back to base_delivery_fee
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const today    = dayNames[new Date().getDay()]
  const weeklyFee = raw?.delivery_fee_schedule?.weekly?.[today]?.fee

  _policy = {
    enabled:             raw?.delivery_fee_enabled          !== false,
    show_to_customer:    raw?.delivery_fee_show_to_customer !== false,
    base_fee:            Number(weeklyFee ?? raw?.base_delivery_fee ?? raw?.delivery_fee ?? 35),
    base_radius_km:      Number(raw?.base_delivery_radius_km ?? 3),
    per_km_beyond:       Number(raw?.per_km_fee_beyond_base ?? raw?.per_km_rate ?? 15),
    free_delivery_above: raw?.free_delivery_above != null ? Number(raw.free_delivery_above) : null,
  }
  _policyAt = Date.now()
  return _policy
}

export function invalidatePolicyCache() {
  _policy   = null
  _policyAt = 0
}

// ─── Core fee calculator ──────────────────────────────────────────────────────
export function calcFee(
  distKm:   number,
  policy:   DeliveryPolicy,
  subtotal  = 0,
): { fee: number; breakdown: string; isFreeDelivery: boolean } {
  if (!policy.enabled)
    return { fee: 0, breakdown: 'Delivery disabled', isFreeDelivery: false }

  // Free delivery threshold (from app_settings)
  if (policy.free_delivery_above && subtotal >= policy.free_delivery_above)
    return {
      fee:             0,
      breakdown:       `🎉 Free delivery (order ≥ ₹${policy.free_delivery_above})`,
      isFreeDelivery:  true,
    }

  if (distKm <= policy.base_radius_km)
    return {
      fee:            policy.base_fee,
      breakdown:      `Base ₹${policy.base_fee} (≤${policy.base_radius_km} km)`,
      isFreeDelivery: false,
    }

  const extra = Math.ceil((distKm - policy.base_radius_km) * policy.per_km_beyond)
  return {
    fee:            policy.base_fee + extra,
    breakdown:      `₹${policy.base_fee} + ₹${extra} (${(distKm - policy.base_radius_km).toFixed(1)} km × ₹${policy.per_km_beyond}/km)`,
    isFreeDelivery: false,
  }
}

// ─── Road distance helper (parallel legs) ────────────────────────────────────
async function safeRoadKm(lat1: number, lng1: number, lat2: number, lng2: number): Promise<number> {
  try {
    return await getRoadDistanceKm(lat1, lng1, lat2, lng2)
  } catch {
    return haversineKm(lat1, lng1, lat2, lng2)
  }
}

// ─── Restaurant orders ────────────────────────────────────────────────────────
/**
 * Fee:     Hub → Merchant → Customer  (full chain, user doesn't see this)
 * Display: Merchant → Customer only
 */
export async function calcDeliveryForRestaurant(
  merchantLat: number,
  merchantLng: number,
  customerLat: number,
  customerLng: number,
  subtotal    = 0,
): Promise<DeliveryResult> {
  const policy = await getDeliveryPolicy()

  // Run both legs in parallel to save time
  const [hubToMerchant, merchantToCustomer] = await Promise.all([
    safeRoadKm(PATTI_HUB.lat, PATTI_HUB.lng, merchantLat, merchantLng),
    safeRoadKm(merchantLat, merchantLng, customerLat, customerLng),
  ])

  const feeDistKm     = Math.round((hubToMerchant + merchantToCustomer) * 10) / 10
  const displayDistKm = Math.round(merchantToCustomer * 10) / 10

  const { fee, breakdown, isFreeDelivery } = calcFee(feeDistKm, policy, subtotal)

  return {
    fee,
    displayDistanceKm:     displayDistKm,
    feeDistanceKm:         feeDistKm,
    breakdown,
    legHubToMerchant:      Math.round(hubToMerchant * 10) / 10,
    legMerchantToCustomer: displayDistKm,
    isFreeDelivery,
  }
}

// ─── Store / Custom orders ────────────────────────────────────────────────────
/** Fee: Hub → Customer.  Display: same. */
export async function calcDeliveryForStore(
  customerLat: number,
  customerLng: number,
  subtotal    = 0,
): Promise<DeliveryResult> {
  const policy = await getDeliveryPolicy()

  const hubToCustomer = await safeRoadKm(PATTI_HUB.lat, PATTI_HUB.lng, customerLat, customerLng)
  const km = Math.round(hubToCustomer * 10) / 10

  const { fee, breakdown, isFreeDelivery } = calcFee(km, policy, subtotal)

  return {
    fee,
    displayDistanceKm:     km,
    feeDistanceKm:         km,
    breakdown,
    legHubToMerchant:      0,
    legMerchantToCustomer: km,
    isFreeDelivery,
  }
}

// ─── Generic wrapper (keeps backward compat with checkout page) ───────────────
export async function calcDeliveryForAddresses(
  merchantLat: number,
  merchantLng: number,
  customerLat: number,
  customerLng: number,
  isStoreOrder = false,
  subtotal     = 0,
): Promise<{ fee: number; distanceKm: number; breakdown: string; isFreeDelivery: boolean }> {
  const result = isStoreOrder
    ? await calcDeliveryForStore(customerLat, customerLng, subtotal)
    : await calcDeliveryForRestaurant(merchantLat, merchantLng, customerLat, customerLng, subtotal)

  return {
    fee:            result.fee,
    distanceKm:     result.displayDistanceKm,
    breakdown:      result.breakdown,
    isFreeDelivery: result.isFreeDelivery,
  }
}
