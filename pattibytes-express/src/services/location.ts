/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationData extends Coordinates {
  address?: string;
  city?: string;
  state?: string;
  postalcode?: string;
}

/**
 * App-level shape (kept as-is to match your existing UI code).
 */
export interface SavedAddress {
  id: string;
  label: string;

  recipientname?: string | null;
  recipientphone?: string | null;

  address: string;
  apartmentfloor?: string | null;
  landmark?: string | null;

  latitude: number;
  longitude: number;

  city?: string | null;
  state?: string | null;
  postalcode?: string | null;

  isdefault: boolean;

  deliveryinstructions?: string | null;

  customerid: string;
  createdat?: string | null;
}

/**
 * Accepts both:
 * - camelCase inputs used by your current service types
 * - snake_case inputs commonly used in Supabase DB schemas
 * - legacy user_id / customer_id variants used in some pages
 */
export type SaveAddressInput = Partial<{
  id: string;

  label: string;

  recipientname: string | null;
  recipientphone: string | null;

  address: string;
  apartmentfloor: string | null;
  landmark: string | null;

  latitude: number;
  longitude: number;

  city: string | null;
  state: string | null;
  postalcode: string | null;

  isdefault: boolean;

  deliveryinstructions: string | null;

  customerid: string;
  createdat: string | null;

  // snake_case equivalents
  recipient_name: string | null;
  recipient_phone: string | null;
  apartment_floor: string | null;
  postal_code: string | null;
  is_default: boolean;
  delivery_instructions: string | null;
  customer_id: string;
  created_at: string | null;

  // legacy / page-level variants
  user_id: string;
}>;

export interface MerchantRow {
  id: string;
  user_id: string;
  business_name: string | null;
  business_type: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  cuisine_types: string[] | null;

  phone: string | null;
  email: string | null;

  address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;

  min_order_amount: number | null;
  delivery_radius_km: number | null;
  estimated_prep_time: number | null;

  is_active: boolean | null;
  is_verified: boolean | null;

  created_at: string;
}

type PostgrestishError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
} | null;

type SavedAddressSchema = 'snake' | 'camel';

class LocationService {
  private safeLogSupabaseError(context: string, error: PostgrestishError) {
    // Many Supabase/PostgREST errors stringify to {} because fields are not enumerable
    // so log the common keys explicitly.
    const e: any = error;
    console.error(context, {
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      code: e?.code,
      raw: e,
    });
  }

  filterByRadius<T extends { latitude: number; longitude: number }>(
    items: T[],
    lat: number,
    lon: number,
    radiusKm: number
  ): T[] {
    const r = Number(radiusKm);
    if (!Number.isFinite(r) || r <= 0) return items;

    return items.filter((x) => {
      const d = this.calculateDistance(lat, lon, x.latitude, x.longitude);
      return d <= r;
    });
  }

  sortByDistance<T extends { latitude: number; longitude: number }>(
    items: T[],
    lat: number,
    lon: number
  ): Array<T & { distance: number }> {
    const withDistance = items.map((x) => ({
      ...x,
      distance: this.calculateDistance(lat, lon, x.latitude, x.longitude),
    }));

    withDistance.sort((a, b) => a.distance - b.distance);
    return withDistance;
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  isWithinRadius(
    centerLat: number,
    centerLon: number,
    pointLat: number,
    pointLon: number,
    radiusKm: number
  ): boolean {
    return this.calculateDistance(centerLat, centerLon, pointLat, pointLon) <= radiusKm;
  }

  calculateDeliveryCharge(distanceKm: number): number {
    const baseCharge = 20;
    const perKmCharge = 8;
    const freeDeliveryDistance = 2;

    if (distanceKm <= freeDeliveryDistance) return 0;

    const chargeableDistance = distanceKm - freeDeliveryDistance;
    return Math.ceil(baseCharge + chargeableDistance * perKmCharge);
  }

  async getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation is not supported by your browser'));

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }),
        (error) => {
          const map: Record<number, string> = {
            1: 'Location permission denied',
            2: 'Location information unavailable',
            3: 'Location request timed out',
          };
          reject(new Error(map[error.code] || 'Failed to get location'));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async reverseGeocode(lat: number, lon: number): Promise<LocationData> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          // Browsers won't let you set User-Agent; keep headers minimal.
          headers: { Accept: 'application/json' },
        }
      );

      if (!response.ok) throw new Error(`Failed to reverse geocode (${response.status})`);

      const data = await response.json();

      return {
        lat,
        lon,
        address: data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        city: data?.address?.city || data?.address?.town || data?.address?.village,
        state: data?.address?.state,
        postalcode: data?.address?.postcode,
      };
    } catch (e) {
      console.error('Reverse geocoding error:', e);
      return { lat, lon, address: `${lat.toFixed(6)}, ${lon.toFixed(6)}` };
    }
  }

  async geocodeAddress(query: string): Promise<LocationData | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );

      if (!response.ok) throw new Error(`Failed to geocode address (${response.status})`);

      const data = await response.json();
      if (!data?.length) return null;

      const item = data[0];
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      return {
        lat,
        lon,
        address: item.display_name,
        city: item?.address?.city || item?.address?.town || item?.address?.village,
        state: item?.address?.state,
        postalcode: item?.address?.postcode,
      };
    } catch (e) {
      console.error('Geocoding error:', e);
      return null;
    }
  }

  // Supports: https://maps.google.com/?q=lat,lng  OR  .../@lat,lng,17z  OR  ...?query=lat,lng
  parseGoogleMapsLink(input: string): Coordinates | null {
    try {
      const s = input.trim();

      const atMatch = s.match(/@(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (atMatch) return { lat: parseFloat(atMatch[1]), lon: parseFloat(atMatch[3]) };

      const qMatch = s.match(/[?&](q|query)=(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (qMatch) return { lat: parseFloat(qMatch[2]), lon: parseFloat(qMatch[4]) };

      const plain = s.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (plain && s.includes('google.')) return { lat: parseFloat(plain[1]), lon: parseFloat(plain[3]) };

      return null;
    } catch {
      return null;
    }
  }

  private normalizeSavedAddressSnake(row: any): SavedAddress {
    return {
      id: String(row.id),
      label: row.label ?? 'Home',

      recipientname: row.recipient_name ?? null,
      recipientphone: row.recipient_phone ?? null,

      address: row.address ?? '',
      apartmentfloor: row.apartment_floor ?? null,
      landmark: row.landmark ?? null,

      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),

      city: row.city ?? null,
      state: row.state ?? null,
      postalcode: row.postal_code ?? null,

      isdefault: Boolean(row.is_default),

      deliveryinstructions: row.delivery_instructions ?? null,

      customerid: String(row.customer_id ?? ''),
      createdat: row.created_at ?? null,
    };
  }

  private normalizeSavedAddressCamel(row: any): SavedAddress {
    return {
      id: String(row.id),
      label: row.label ?? 'Home',

      recipientname: row.recipientname ?? null,
      recipientphone: row.recipientphone ?? null,

      address: row.address ?? '',
      apartmentfloor: row.apartmentfloor ?? null,
      landmark: row.landmark ?? null,

      latitude: Number(row.latitude ?? 0),
      longitude: Number(row.longitude ?? 0),

      city: row.city ?? null,
      state: row.state ?? null,
      postalcode: row.postalcode ?? null,

      isdefault: Boolean(row.isdefault),

      deliveryinstructions: row.deliveryinstructions ?? null,

      customerid: String(row.customerid ?? ''),
      createdat: row.createdat ?? null,
    };
  }

  private resolveCustomerId(input: SaveAddressInput): string {
    const cid = input.customerid ?? input.customer_id ?? input.user_id;
    if (!cid) throw new Error('Missing customer id (customerid/customer_id/user_id)');
    return String(cid);
  }

  private resolveIsDefault(input: SaveAddressInput): boolean {
    const v = input.isdefault ?? input.is_default;
    return Boolean(v);
  }

  async getSavedAddresses(customerId: string): Promise<SavedAddress[]> {
    // Try snake_case schema first (most common in Supabase), then camelCase.
    const tryOrder: SavedAddressSchema[] = ['snake', 'camel'];

    let lastError: any = null;

    for (const schema of tryOrder) {
      if (schema === 'snake') {
        const { data, error } = await supabase
          .from('saved_addresses')
          .select(
            `
            id,
            label,
            recipient_name,
            recipient_phone,
            address,
            apartment_floor,
            landmark,
            latitude,
            longitude,
            city,
            state,
            postal_code,
            is_default,
            delivery_instructions,
            customer_id,
            created_at
          `
          )
          .eq('customer_id', customerId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!error) return (data || []).map((r: any) => this.normalizeSavedAddressSnake(r));
        lastError = error;
      } else {
        const { data, error } = await supabase
          .from('savedaddresses')
          .select('*')
          .eq('customerid', customerId)
          .order('isdefault', { ascending: false })
          .order('createdat', { ascending: false });

        if (!error) return (data || []).map((r: any) => this.normalizeSavedAddressCamel(r));
        lastError = error;
      }
    }

    this.safeLogSupabaseError('Error fetching saved addresses:', lastError);
    return [];
  }

  async saveAddress(input: SaveAddressInput): Promise<SavedAddress | null> {
    try {
      const customerId = this.resolveCustomerId(input);
      const isDefault = this.resolveIsDefault(input);

      // Prefer snake_case table first.
      // If that table doesn't exist in your DB, it will fail and we fallback to camelCase.
      {
        if (isDefault) {
          await supabase.from('saved_addresses').update({ is_default: false }).eq('customer_id', customerId);
        }

        const row = {
          label: input.label ?? 'Home',

          recipient_name: input.recipientname ?? input.recipient_name ?? null,
          recipient_phone: input.recipientphone ?? input.recipient_phone ?? null,

          address: input.address ?? '',
          apartment_floor: input.apartmentfloor ?? input.apartment_floor ?? null,
          landmark: input.landmark ?? null,

          latitude: Number(input.latitude ?? 0),
          longitude: Number(input.longitude ?? 0),

          city: input.city ?? null,
          state: input.state ?? null,
          postal_code: input.postalcode ?? input.postal_code ?? null,

          is_default: isDefault,

          delivery_instructions: input.deliveryinstructions ?? input.delivery_instructions ?? null,

          customer_id: customerId,
        };

        const { data, error } = await supabase.from('saved_addresses').insert([row]).select().single();
        if (!error) return this.normalizeSavedAddressSnake(data);

        // fallback
      }

      // camelCase fallback
      {
        if (isDefault) {
          await supabase.from('savedaddresses').update({ isdefault: false }).eq('customerid', customerId);
        }

        const row = {
          label: input.label ?? 'Home',

          recipientname: input.recipientname ?? input.recipient_name ?? null,
          recipientphone: input.recipientphone ?? input.recipient_phone ?? null,

          address: input.address ?? '',
          apartmentfloor: input.apartmentfloor ?? input.apartment_floor ?? null,
          landmark: input.landmark ?? null,

          latitude: Number(input.latitude ?? 0),
          longitude: Number(input.longitude ?? 0),

          city: input.city ?? null,
          state: input.state ?? null,
          postalcode: input.postalcode ?? input.postal_code ?? null,

          isdefault: isDefault,

          deliveryinstructions: input.deliveryinstructions ?? input.delivery_instructions ?? null,

          customerid: customerId,
        };

        const { data, error } = await supabase.from('savedaddresses').insert([row]).select().single();
        if (error) throw error;

        return this.normalizeSavedAddressCamel(data);
      }
    } catch (e: any) {
      console.error('Error saving address:', e?.message || e);
      return null;
    }
  }

  async updateAddress(addressId: string, updates: Partial<SaveAddressInput>): Promise<boolean> {
    try {
      const wantsDefault = updates.isdefault ?? updates.is_default;

      // Try snake first
      {
        if (wantsDefault === true) {
          const { data: row } = await supabase
            .from('saved_addresses')
            .select('customer_id')
            .eq('id', addressId)
            .single();

          const customerId = row?.customer_id;
          if (customerId) {
            await supabase.from('saved_addresses').update({ is_default: false }).eq('customer_id', customerId);
          }
        }

        const patch: any = {};
        if ('label' in updates) patch.label = updates.label;
        if ('recipientname' in updates || 'recipient_name' in updates)
          patch.recipient_name = (updates as any).recipientname ?? (updates as any).recipient_name ?? null;
        if ('recipientphone' in updates || 'recipient_phone' in updates)
          patch.recipient_phone = (updates as any).recipientphone ?? (updates as any).recipient_phone ?? null;
        if ('address' in updates) patch.address = updates.address;
        if ('apartmentfloor' in updates || 'apartment_floor' in updates)
          patch.apartment_floor = (updates as any).apartmentfloor ?? (updates as any).apartment_floor ?? null;
        if ('landmark' in updates) patch.landmark = updates.landmark ?? null;
        if ('latitude' in updates) patch.latitude = Number(updates.latitude);
        if ('longitude' in updates) patch.longitude = Number(updates.longitude);
        if ('city' in updates) patch.city = updates.city ?? null;
        if ('state' in updates) patch.state = updates.state ?? null;
        if ('postalcode' in updates || 'postal_code' in updates)
          patch.postal_code = (updates as any).postalcode ?? (updates as any).postal_code ?? null;
        if ('deliveryinstructions' in updates || 'delivery_instructions' in updates)
          patch.delivery_instructions =
            (updates as any).deliveryinstructions ?? (updates as any).delivery_instructions ?? null;
        if (wantsDefault !== undefined) patch.is_default = Boolean(wantsDefault);

        const { error } = await supabase.from('saved_addresses').update(patch).eq('id', addressId);
        if (!error) return true;
      }

      // camel fallback
      {
        if (wantsDefault === true) {
          const { data: row } = await supabase.from('savedaddresses').select('customerid').eq('id', addressId).single();
          const customerId = row?.customerid;
          if (customerId) {
            await supabase.from('savedaddresses').update({ isdefault: false }).eq('customerid', customerId);
          }
        }

        const patch: any = {};
        if ('label' in updates) patch.label = updates.label;
        if ('recipientname' in updates || 'recipient_name' in updates)
          patch.recipientname = (updates as any).recipientname ?? (updates as any).recipient_name ?? null;
        if ('recipientphone' in updates || 'recipient_phone' in updates)
          patch.recipientphone = (updates as any).recipientphone ?? (updates as any).recipient_phone ?? null;
        if ('address' in updates) patch.address = updates.address;
        if ('apartmentfloor' in updates || 'apartment_floor' in updates)
          patch.apartmentfloor = (updates as any).apartmentfloor ?? (updates as any).apartment_floor ?? null;
        if ('landmark' in updates) patch.landmark = updates.landmark ?? null;
        if ('latitude' in updates) patch.latitude = Number(updates.latitude);
        if ('longitude' in updates) patch.longitude = Number(updates.longitude);
        if ('city' in updates) patch.city = updates.city ?? null;
        if ('state' in updates) patch.state = updates.state ?? null;
        if ('postalcode' in updates || 'postal_code' in updates)
          patch.postalcode = (updates as any).postalcode ?? (updates as any).postal_code ?? null;
        if ('deliveryinstructions' in updates || 'delivery_instructions' in updates)
          patch.deliveryinstructions =
            (updates as any).deliveryinstructions ?? (updates as any).delivery_instructions ?? null;
        if (wantsDefault !== undefined) patch.isdefault = Boolean(wantsDefault);

        const { error } = await supabase.from('savedaddresses').update(patch).eq('id', addressId);
        if (error) throw error;
        return true;
      }
    } catch (e) {
      console.error('Error updating address:', e);
      return false;
    }
  }

  async deleteAddress(addressId: string): Promise<boolean> {
    try {
      {
        const { error } = await supabase.from('saved_addresses').delete().eq('id', addressId);
        if (!error) return true;
      }
      {
        const { error } = await supabase.from('savedaddresses').delete().eq('id', addressId);
        if (error) throw error;
        return true;
      }
    } catch (e) {
      console.error('Error deleting address:', e);
      return false;
    }
  }

  async setDefaultAddress(customerId: string, addressId: string): Promise<boolean> {
    try {
      {
        await supabase.from('saved_addresses').update({ is_default: false }).eq('customer_id', customerId);
        const { error } = await supabase.from('saved_addresses').update({ is_default: true }).eq('id', addressId);
        if (!error) return true;
      }
      {
        await supabase.from('savedaddresses').update({ isdefault: false }).eq('customerid', customerId);
        const { error } = await supabase.from('savedaddresses').update({ isdefault: true }).eq('id', addressId);
        if (error) throw error;
        return true;
      }
    } catch (e) {
      console.error('Error setting default address:', e);
      return false;
    }
  }

  async getDefaultAddress(customerId: string): Promise<SavedAddress | null> {
    {
      const { data, error } = await supabase
        .from('saved_addresses')
        .select(
          `
          id,
          label,
          recipient_name,
          recipient_phone,
          address,
          apartment_floor,
          landmark,
          latitude,
          longitude,
          city,
          state,
          postal_code,
          is_default,
          delivery_instructions,
          customer_id,
          created_at
        `
        )
        .eq('customer_id', customerId)
        .eq('is_default', true)
        .single();

      if (!error && data) return this.normalizeSavedAddressSnake(data);
    }

    {
      const { data, error } = await supabase
        .from('savedaddresses')
        .select('*')
        .eq('customerid', customerId)
        .eq('isdefault', true)
        .single();

      if (error) return null;
      return data ? this.normalizeSavedAddressCamel(data) : null;
    }
  }

  /**
   * Nearby merchants for a user location:
   * - Only active & verified
   * - Only merchants with lat/lon
   * - Distance must be <= merchant.delivery_radius_km
   */
  async getNearbyMerchantsForUser(
    userLat: number,
    userLon: number
  ): Promise<(MerchantRow & { distance_km: number })[]> {
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .eq('is_active', true)
        .eq('is_verified', true)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      const list = (data || []) as MerchantRow[];

      return list
        .map((m) => {
          const distance_km =
            m.latitude == null || m.longitude == null
              ? Number.POSITIVE_INFINITY
              : this.calculateDistance(userLat, userLon, m.latitude, m.longitude);

          return { ...m, distance_km };
        })
        .filter((m) => {
          const radius = Number(m.delivery_radius_km ?? 0);
          return Number.isFinite(m.distance_km) && radius > 0 && m.distance_km <= radius;
        })
        .sort((a, b) => a.distance_km - b.distance_km);
    } catch (e) {
      console.error('Error getting nearby merchants:', e);
      return [];
    }
  }
}

export const locationService = new LocationService();
