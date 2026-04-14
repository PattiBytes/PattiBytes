// src/lib/dishTiming.ts
/**
 * Handles dish_timing JSONB from menu_items table.
 *
 * DB format (actual):
 * {
 *   "type": "scheduled",
 *   "enabled": true,
 *   "slots": [{ "from": "09:00", "to": "16:00", "days": [1,2,3,4,5,6,0] }]
 * }
 *
 * Legacy formats also handled:
 *   { "start": "09:00", "end": "16:00" }   ← old simple object
 *   "09:00-16:00"                            ← old string
 */

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DishTimingSlot {
  from: string    // "HH:MM"
  to:   string    // "HH:MM"
  days: number[]  // JS getDay(): 0=Sun, 1=Mon … 6=Sat. Empty = all days.
}

export interface DishTimingScheduled {
  type:    'scheduled'
  enabled: boolean
  slots:   DishTimingSlot[]
}

// Keep backward-compat export used in older imports
export interface DishTimingWindow { start: string; end: string }

// ─── Internal helpers ─────────────────────────────────────────────────────────
function toMin(t: string): number {
  const [hh = '0', mm = '0'] = String(t).split(':')
  return Number(hh) * 60 + Number(mm)
}

function fmtTime(t: string): string {
  const [hh = '0', mm = '0'] = String(t).split(':')
  const h    = Number(hh)
  const m    = Number(mm)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return m > 0
    ? `${h12}:${String(m).padStart(2, '0')} ${ampm}`
    : `${h12} ${ampm}`
}

function timeInWindow(from: string, to: string): boolean {
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const s   = toMin(from)
  const e   = toMin(to)
  // handles overnight window e.g. 22:00–02:00
  return s <= e ? cur >= s && cur <= e : cur >= s || cur <= e
}

// ─── Normaliser ───────────────────────────────────────────────────────────────
/**
 * Converts any raw dish_timing value (string | legacy object | new JSONB) into
 * a canonical DishTimingScheduled object, or null if no timing is defined.
 */
function normalise(raw: unknown): DishTimingScheduled | null {
  if (raw == null) return null

  // ── New DB JSONB format: { type:"scheduled", enabled, slots:[{from,to,days}] }
  if (
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    (raw as any).type === 'scheduled'
  ) {
    const r = raw as Record<string, any>

    if (r.enabled === false) {
      return { type: 'scheduled', enabled: false, slots: [] }
    }

    const slots: DishTimingSlot[] = (Array.isArray(r.slots) ? r.slots : []).map(
      (s: any) => ({
        from: String(s.from ?? s.start ?? '00:00').trim(),
        to:   String(s.to   ?? s.end   ?? '23:59').trim(),
        days: Array.isArray(s.days) ? s.days.map(Number) : [0, 1, 2, 3, 4, 5, 6],
      })
    )

    return { type: 'scheduled', enabled: true, slots }
  }

  // ── Legacy object: { start, end } ──────────────────────────────────────────
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, any>
    const s = String(r.start ?? r.open  ?? '').trim()
    const e = String(r.end   ?? r.close ?? '').trim()
    if (s && e) {
      return {
        type:    'scheduled',
        enabled: true,
        slots:   [{ from: s, to: e, days: [0, 1, 2, 3, 4, 5, 6] }],
      }
    }
    return null
  }

  // ── Array: take the first element ──────────────────────────────────────────
  if (Array.isArray(raw) && raw.length > 0) {
    return normalise(raw[0])
  }

  // ── Simple string: "HH:MM-HH:MM" ──────────────────────────────────────────
  if (typeof raw === 'string') {
    const str = raw.trim()
    if (!str) return null
    const idx = str.indexOf('-')
    if (idx < 1) return null
    const from = str.slice(0, idx).trim()
    const to   = str.slice(idx + 1).trim()
    if (!from || !to) return null
    return {
      type:    'scheduled',
      enabled: true,
      slots:   [{ from, to, days: [0, 1, 2, 3, 4, 5, 6] }],
    }
  }

  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Is this dish available right now?
 *  - No timing  → always true
 *  - enabled:false → always false
 *  - Otherwise  → today's weekday must be in slot.days AND time in [from, to]
 */
export function isDishAvailableNow(raw: unknown): boolean {
  const timing = normalise(raw)
  if (!timing)          return true   // no timing = always available
  if (!timing.enabled)  return false  // merchant disabled this item

  const today = new Date().getDay()   // 0=Sun … 6=Sat

  for (const slot of timing.slots) {
    const dayOk = slot.days.length === 0 || slot.days.includes(today)
    if (dayOk && timeInWindow(slot.from, slot.to)) return true
  }
  return false
}

/**
 * Human-readable availability window, e.g. "9 AM – 4 PM"
 * Returns null when no timing is set (item always available → show nothing).
 */
export function formatDishTiming(raw: unknown): string | null {
  const timing = normalise(raw)
  if (!timing)          return null
  if (!timing.enabled)  return 'Not available'
  if (!timing.slots.length) return null

  const today  = new Date().getDay()
  // Prefer today's slots; fall back to all slots
  const toShow = timing.slots.filter(
    s => s.days.length === 0 || s.days.includes(today)
  )
  const source = toShow.length ? toShow : timing.slots

  const unique = [
    ...new Set(source.map(s => `${fmtTime(s.from)} – ${fmtTime(s.to)}`)),
  ]
  return unique.join('  •  ')
}

/**
 * How many minutes until the next availability window opens.
 * Returns 0  if already available.
 * Returns null if no timing is set (always available).
 */
export function minutesUntilAvailable(raw: unknown): number | null {
  const timing = normalise(raw)
  if (!timing || !timing.enabled) return null
  if (isDishAvailableNow(raw))    return 0

  const now   = new Date()
  const today = now.getDay()
  const cur   = now.getHours() * 60 + now.getMinutes()

  let minWait: number | null = null

  for (const slot of timing.slots) {
    const days = slot.days.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : slot.days
    const s    = toMin(slot.from)

    // Today — is next window start still ahead?
    if (days.includes(today) && s > cur) {
      const wait = s - cur
      if (minWait === null || wait < minWait) minWait = wait
    }

    // Next 7 days — find nearest future day in this slot's days
    for (let d = 1; d <= 7; d++) {
      const nextDay = (today + d) % 7
      if (days.includes(nextDay)) {
        const wait = d * 1440 - cur + s
        if (minWait === null || wait < minWait) minWait = wait
        break
      }
    }
  }

  return minWait
}

/**
 * All slots active today. Useful for showing "Today: 9 AM – 4 PM, 7 PM – 10 PM".
 */
export function getTodaySlots(raw: unknown): DishTimingSlot[] {
  const timing = normalise(raw)
  if (!timing || !timing.enabled) return []
  const today = new Date().getDay()
  return timing.slots.filter(
    s => s.days.length === 0 || s.days.includes(today)
  )
}