import type { AppSettings, SavedAddress } from './types'

export function calcDeliveryFee(
  distKm: number,
  s: AppSettings,
): { fee: number; breakdown: string } {
  const BASE_KM  = s.base_delivery_radius_km ?? 3
  const BASE_FEE = s.base_delivery_fee ?? 35
  const PER_KM   = s.per_km_fee_beyond_base ?? s.per_km_rate ?? 15

  if (distKm <= BASE_KM)
    return { fee: BASE_FEE, breakdown: `Base ₹${BASE_FEE} (within ${BASE_KM} km)` }

  const extra = Math.ceil((distKm - BASE_KM) * PER_KM)
  return {
    fee:       BASE_FEE + extra,
    breakdown: `₹${BASE_FEE} + ₹${extra} (${(distKm - BASE_KM).toFixed(1)} km × ₹${PER_KM}/km)`,
  }
}

export function formatAddr(a: SavedAddress): string {
  return [
    a.address,
    a.apartment_floor ? `Flat/Floor: ${a.apartment_floor}` : '',
    a.landmark        ? `Near: ${a.landmark}` : '',
    [a.city, a.state].filter(Boolean).join(', '),
    a.postal_code ?? '',
  ].filter(Boolean).join('\n')
}

export function getAddrEmoji(label: string) {
  if (label === 'Home') return '🏠'
  if (label === 'Work') return '🏢'
  return '📍'
}

/** 0–100 progress toward free delivery threshold */
export function freeDeliveryProgress(subtotal: number, threshold?: number | null) {
  if (!threshold || threshold <= 0) return 0
  return Math.min(100, Math.round((subtotal / threshold) * 100))
}

/** "35–45 min" label combining prep + transit estimate */
export function estimatedDeliveryLabel(prepMins?: number | null, distKm = 0) {
  const prep    = prepMins ?? 30
  const transit = Math.round(distKm * 4 + 10)
  const lo      = prep + transit
  return `${lo}–${lo + 10} min`
}
