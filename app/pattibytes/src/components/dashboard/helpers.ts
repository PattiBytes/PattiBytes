import { Merchant } from './types'

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1) / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function merchantIsOpen(m: Merchant): boolean {
  if (!m.opening_time || !m.closing_time) return true
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const [oh, om] = m.opening_time.split(':').map(Number)
  const [ch, cm] = m.closing_time.split(':').map(Number)
  let close = ch * 60 + cm
  const open = oh * 60 + om
  if (close <= open) close += 1440
  return cur >= open && cur <= close
}

export function openTimeLabel(m: Merchant): string {
  if (!m.opening_time) return ''
  const [h, min] = m.opening_time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `Opens at ${hh}:${String(min).padStart(2, '0')} ${ampm}`
}

export function isAnnouncementActive(a: any): boolean {
  if (!a?.enabled) return false
  const now = Date.now()
  const s = a.start_at ? new Date(a.start_at).getTime() : NaN
  const e = a.end_at ? new Date(a.end_at).getTime() : NaN
  if (Number.isFinite(s) && now < s) return false
  if (Number.isFinite(e) && now > e) return false
  return !!(String(a.title ?? '').trim() || String(a.message ?? '').trim())
}