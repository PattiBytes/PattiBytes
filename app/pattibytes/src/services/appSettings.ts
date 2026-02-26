import { supabase } from '../lib/supabase'

const APP_SETTINGS_ID = 'a6ba88a3-6fe9-4652-8c5d-b25ee1a05e39'

export type DeliveryPolicy = {
  enabled: boolean
  showToCustomer: boolean
  baseFee: number
  baseRadiusKm: number
  perKmFeeAfterBase: number
}

let _cached: any = null

export const appSettingsService = {
  async get() {
    if (_cached) return _cached
    const { data } = await supabase.from('app_settings').select('*').eq('id', APP_SETTINGS_ID).maybeSingle()
    _cached = data
    return data
  },

  async getDeliveryPolicyNow(): Promise<DeliveryPolicy> {
    const row = await this.get()
    return {
      enabled: Boolean(row?.delivery_fee_enabled ?? true),
      showToCustomer: Boolean(row?.show_delivery_fee_to_customer ?? true),
      baseFee: Number(row?.delivery_base_fee ?? 30),
      baseRadiusKm: Number(row?.delivery_base_radius_km ?? 3),
      perKmFeeAfterBase: Number(row?.delivery_per_km_fee ?? 8),
    }
  },

  clearCache() {
    _cached = null
  },
}
