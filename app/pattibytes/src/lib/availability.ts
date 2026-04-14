import type { DishTiming, MenuResult, RestaurantResult, CustomProductResult } from '../types/search'

function hhmm(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function nowMinutes(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

function nowDay(): number {
  return new Date().getDay() // 0=Sun
}

// ── Menu item availability ────────────────────────────────────────────────────
export function isDishAvailableNow(item: MenuResult): boolean {
  if (!item.is_available) return false

  let timing: DishTiming | null = null
  if (typeof item.dish_timing === 'string') {
    try { timing = JSON.parse(item.dish_timing) }
    catch { timing = null }
  } else {
    timing = item.dish_timing ?? null
  }

  if (!timing || !timing.enabled) return true   // no schedule = always on

  const now  = nowMinutes()
  const day  = nowDay()

  return (timing.slots ?? []).some(slot => {
    if (!slot.days?.includes(day)) return false
    return now >= hhmm(slot.from) && now <= hhmm(slot.to)
  })
}

export function dishNextAvailable(item: MenuResult): string | null {
  let timing: DishTiming | null = null
  if (typeof item.dish_timing === 'string') {
    try { timing = JSON.parse(item.dish_timing) }
    catch { return null }
  } else {
    timing = item.dish_timing ?? null
  }
  if (!timing?.enabled || !timing.slots?.length) return null

  const today = nowDay()
  // Look ahead up to 7 days
  for (let d = 0; d < 7; d++) {
    const day = (today + d) % 7
    const slots = timing.slots.filter(s => s.days?.includes(day))
    if (!slots.length) continue
    const earliest = slots.reduce((a, b) => hhmm(a.from) < hhmm(b.from) ? a : b)
    const label = d === 0 ? 'today' : d === 1 ? 'tomorrow' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]
    return `Available ${label} from ${earliest.from}`
  }
  return null
}

// ── Restaurant availability ───────────────────────────────────────────────────
export function isRestaurantOpen(r: RestaurantResult): boolean {
  if (!r.is_active) return false
  if (!r.opening_time || !r.closing_time) return true
  const now    = nowMinutes()
  const open   = hhmm(r.opening_time)
  const close  = hhmm(r.closing_time)
  // Handle midnight-spanning hours (e.g. 22:00 – 02:00)
  if (close < open) return now >= open || now <= close
  return now >= open && now <= close
}

// ── Custom product availability ───────────────────────────────────────────────
export function isCustomProductAvailable(p: CustomProductResult): boolean {
  if (!p.isactive) return false
  if (p.stock_qty !== null && p.stock_qty !== undefined && p.stock_qty <= 0) return false

  const now = nowMinutes()
  const day = nowDay()

  if (p.available_days?.length && !p.available_days.includes(day)) return false
  if (p.available_from && now < hhmm(p.available_from)) return false
  if (p.available_to   && now > hhmm(p.available_to))   return false
  return true
}