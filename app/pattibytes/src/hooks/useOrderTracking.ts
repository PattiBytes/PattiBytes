import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type DriverLocation = {
  driver_id: string
  lat: number
  lng: number
  heading: number | null
  updated_at: string | null
}

export function useOrderTracking(driverId: string | null) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null)

  useEffect(() => {
    if (!driverId) { setDriverLocation(null); return }

    supabase
      .from('driver_locations')
      .select('*')
      .eq('driver_id', driverId)
      .maybeSingle()
      .then(({ data }) => { if (data) setDriverLocation(data as DriverLocation) })

    const ch = supabase
      .channel(`driver-loc-${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${driverId}` },
        (payload) => setDriverLocation(payload.new as DriverLocation))
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [driverId])

  return driverLocation
}
