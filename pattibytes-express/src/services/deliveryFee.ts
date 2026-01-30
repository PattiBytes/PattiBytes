import { supabase } from '@/lib/supabase';

interface DeliveryFeeConfig {
  base_fee_within_range: number;
  free_delivery_radius_km: number;
  per_km_fee_beyond_range: number;
  base_city_latitude: number;
  base_city_longitude: number;
}

class DeliveryFeeService {
  private config: DeliveryFeeConfig = {
    base_fee_within_range: 10,
    free_delivery_radius_km: 5,
    per_km_fee_beyond_range: 15,
    base_city_latitude: 31.3260, // Patti coordinates
    base_city_longitude: 74.8560,
  };

  async loadConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'delivery_base_fee',
          'delivery_free_radius_km',
          'delivery_per_km_fee',
          'base_city_latitude',
          'base_city_longitude',
        ]);

      if (!error && data) {
        data.forEach((setting) => {
          switch (setting.key) {
            case 'delivery_base_fee':
              this.config.base_fee_within_range = parseFloat(setting.value) || 10;
              break;
            case 'delivery_free_radius_km':
              this.config.free_delivery_radius_km = parseFloat(setting.value) || 5;
              break;
            case 'delivery_per_km_fee':
              this.config.per_km_fee_beyond_range = parseFloat(setting.value) || 15;
              break;
            case 'base_city_latitude':
              this.config.base_city_latitude = parseFloat(setting.value) || 31.3260;
              break;
            case 'base_city_longitude':
              this.config.base_city_longitude = parseFloat(setting.value) || 74.8560;
              break;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load delivery fee config:', error);
    }
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  calculateDeliveryFee(deliveryLat: number, deliveryLon: number): {
    fee: number;
    distance: number;
    breakdown: string;
  } {
    const distance = this.calculateDistance(
      this.config.base_city_latitude,
      this.config.base_city_longitude,
      deliveryLat,
      deliveryLon
    );

    let fee = 0;
    let breakdown = '';

    if (distance <= this.config.free_delivery_radius_km) {
      fee = this.config.base_fee_within_range;
      breakdown = `Within ${this.config.free_delivery_radius_km}km - Base fee ₹${this.config.base_fee_within_range}`;
    } else {
      const extraDistance = distance - this.config.free_delivery_radius_km;
      fee = this.config.base_fee_within_range + (extraDistance * this.config.per_km_fee_beyond_range);
      breakdown = `Base ₹${this.config.base_fee_within_range} + ${extraDistance.toFixed(1)}km × ₹${this.config.per_km_fee_beyond_range}`;
    }

    return {
      fee: Math.round(fee * 100) / 100,
      distance: Math.round(distance * 100) / 100,
      breakdown,
    };
  }
}

export const deliveryFeeService = new DeliveryFeeService();
