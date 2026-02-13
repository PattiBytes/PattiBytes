/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { locationService, calculateDeliveryFeeByDistance, type DeliveryFeeQuote } from '@/services/location';

type FeeResult = {
  fee: number;
  distance: number;
  breakdown: string;
};

class DeliveryFeeService {
  // Keep API compatible with your current pages (no-op config load)
  async loadConfig(): Promise<void> {
    return;
  }

  /**
   * If you only have customer's location (no merchant coords),
   * we cannot calculate distance-to-merchant, so return base fee.
   */
  calculateDeliveryFee(_customerLat: number, _customerLon: number): FeeResult {
    const q = calculateDeliveryFeeByDistance(0);
    return { fee: q.fee, distance: 0, breakdown: 'Base delivery fee (merchant distance not provided)' };
  }

  /**
   * Correct calculation: merchant -> customer distance.
   */
  calculateDeliveryFeeFromMerchant(
    merchantLat: number,
    merchantLon: number,
    customerLat: number,
    customerLon: number
  ): FeeResult {
    const q: DeliveryFeeQuote = locationService.calculateDeliveryFeeFromMerchant(
      merchantLat,
      merchantLon,
      customerLat,
      customerLon
    );

    return { fee: q.fee, distance: q.distanceKm, breakdown: q.breakdown };
  }
}

export const deliveryFeeService = new DeliveryFeeService();
export default deliveryFeeService;
