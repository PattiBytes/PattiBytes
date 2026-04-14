import {
  formatDishTiming as formatDishTimingBase,
  isDishAvailableNow as isDishAvailableNowBase,
  minutesUntilAvailable as minutesUntilAvailableBase,
} from '../../lib/dishTiming'

export type SortKey = 'recommended' | 'name' | 'price_low' | 'price_high'

export type MenuOffer = {
  label: string
  subLabel?: string
  promoCode?: string
}

export function str(v: any, fallback = ''): string {
  const s = v == null ? '' : String(v)
  return s || fallback
}

export function num(v: any, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function bool(v: any): boolean {
  return v === true
}

export function isVegOf(x: any): boolean {
  return bool(x?.is_veg ?? x?.isveg ?? x?.isVeg)
}

export function isAvailableOf(x: any): boolean {
  const v = x?.is_available ?? x?.isavailable ?? x?.isAvailable
  return v === undefined ? true : v !== false
}

export function imageUrlOf(x: any): string | null {
  return x?.image_url ?? x?.imageurl ?? x?.imageUrl ?? null
}

export function isFeaturedOf(x: any): boolean {
  const d = x?.is_featured ?? x?.isfeatured ?? x?.featured ?? x?.isFeatured
  if (d !== undefined) return bool(d)
  const t = x?.tags
  if (Array.isArray(t)) return t.map(String).includes('featured')
  if (typeof t === 'string') return t.toLowerCase().includes('featured')
  return false
}

export function merchantNameOf(m: any): string {
  return str(m?.business_name ?? m?.businessname ?? m?.businessName, 'Restaurant')
}

export function dishTimingOf(x: any): string | null {
  return x?.dish_timing ?? x?.dishtiming ?? null
}

export function finalPriceOf(x: any): number {
  const mrp = num(x?.price, 0)
  const dp = num(x?.discount_percentage ?? x?.discountpercentage, 0)
  return dp > 0 ? mrp * (1 - dp / 100) : mrp
}

export function opensInLabel(mins: number | null): string {
  if (mins == null || mins <= 0) return ''
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export const isDishAvailableNow  = isDishAvailableNowBase
export const formatDishTiming    = formatDishTimingBase
export const minutesUntilAvailable = minutesUntilAvailableBase