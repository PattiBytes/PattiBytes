'use client';

import { locationService, calculateDeliveryFeeByDistance, type DeliveryFeeQuote } from '@/services/location';

class DeliveryFeeService {
  async loadConfig(): Promise<void> { return; }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateDeliveryFee(_customerLat: number, _customerLon: number) {
    const q = calculateDeliveryFeeByDistance(0);
    return { fee: q.fee, distance: 0, breakdown: 'Base delivery fee (merchant distance not provided)' };
  }

  calculateDeliveryFeeFromMerchant(merchantLat: number, merchantLon: number, customerLat: number, customerLon: number) {
    const q: DeliveryFeeQuote = locationService.calculateDeliveryFeeFromMerchant(merchantLat, merchantLon, customerLat, customerLon);
    return { fee: q.fee, distance: q.distanceKm, breakdown: q.breakdown };
  }
}

export const deliveryFeeService = new DeliveryFeeService();
export default deliveryFeeService;
