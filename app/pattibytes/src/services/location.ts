import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'

const LOCATIONIQ_KEY = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY!

export type SavedAddress = {
  id: string
  label: string
  recipient_name?: string | null
  recipient_phone?: string | null
  address: string
  apartment_floor?: string | null
  landmark?: string | null
  latitude: number
  longitude: number
  city?: string | null
  state?: string | null
  postal_code?: string | null
  is_default: boolean
  isdefault?: boolean
  delivery_instructions?: string | null
  created_at?: string | null
  customer_id?: string | null
}

export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') throw new Error('Location permission denied')

  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
  return { lat: pos.coords.latitude, lng: pos.coords.longitude }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string; city: string; state: string; postal_code: string
}> {
  try {
    const res = await fetch(
      `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`
    )
    const data = await res.json()
    return {
      address: data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      city: data.address?.city || data.address?.town || data.address?.village || '',
      state: data.address?.state || '',
      postal_code: data.address?.postcode || '',
    }
  } catch {
    return { address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, city: '', state: '', postal_code: '' }
  }
}

export async function getRoadDistanceKm(
  lat1: number, lon1: number, lat2: number, lon2: number
): Promise<number> {
  try {
    const url =
      `https://us1.locationiq.com/v1/directions/driving/${lon1},${lat1};${lon2},${lat2}` +
      `?key=${LOCATIONIQ_KEY}&overview=false`
    const res = await fetch(url)
    const data = await res.json()
    const meters = data?.routes?.[0]?.distance
    if (meters && Number.isFinite(Number(meters))) return Number(meters) / 1000
    throw new Error('No route')
  } catch {
    return haversineKm(lat1, lon1, lat2, lon2)
  }
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function calculateDeliveryFee(
  distKm: number,
  opts: { baseFee: number; baseKm: number; perKmBeyond: number }
): number {
  if (distKm <= opts.baseKm) return opts.baseFee
  return Math.ceil(opts.baseFee + (distKm - opts.baseKm) * opts.perKmBeyond)
}

export async function getSavedAddresses(userId: string): Promise<SavedAddress[]> {
  const { data, error } = await supabase
    .from('saved_addresses')
    .select('*')
    .eq('customer_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return []
  return (data || []) as SavedAddress[]
}

export async function getDefaultAddress(userId: string): Promise<SavedAddress | null> {
  const addrs = await getSavedAddresses(userId)
  return addrs.find((a) => a.is_default || a.isdefault) || addrs[0] || null
}

export async function saveAddress(payload: Partial<SavedAddress> & { customer_id: string }): Promise<SavedAddress | null> {
  if (payload.is_default) {
    await supabase.from('saved_addresses').update({ is_default: false }).eq('customer_id', payload.customer_id)
  }
  const { data, error } = await supabase.from('saved_addresses').insert([payload]).select().single()
  if (error) throw error
  return data as SavedAddress
}

export async function updateAddress(id: string, payload: Partial<SavedAddress>): Promise<void> {
  const { error } = await supabase.from('saved_addresses').update(payload).eq('id', id)
  if (error) throw error
}

export async function deleteAddress(id: string): Promise<boolean> {
  const { error } = await supabase.from('saved_addresses').delete().eq('id', id)
  return !error
}

export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  await supabase.from('saved_addresses').update({ is_default: false }).eq('customer_id', userId)
  await supabase.from('saved_addresses').update({ is_default: true }).eq('id', id)
}
