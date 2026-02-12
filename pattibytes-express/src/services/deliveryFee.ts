/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { supabase } from '@/lib/supabase';
import { getRoadDistanceKmViaApi } from '@/services/location';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type DeliveryFeeSchedule = {
  timezone?: string;
  weekly?: Record<DayKey, { enabled?: boolean; fee?: number }>;
  overrides?: any[];
};

export type DeliveryFeeQuote = {
  enabled: boolean;
  showToCustomer: boolean;
  distanceKm: number;
  fee: number;
  breakdown: string;
  used: 'road' | 'aerial' | 'none';
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function asNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function asBool(v: any, fallback = false) {
  if (v === null || v === undefined) return fallback;
  return Boolean(v);
}

function getDayKey(now: Date, tz: string): DayKey {
  const s = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: tz })
    .format(now)
    .toLowerCase()
    .slice(0, 3);
  return (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].includes(s) ? s : 'mon') as DayKey;
}

// Aerial fallback (haversine)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Rule:
 * - If distance <= 3km: charge within3kmFee (from app_settings or schedule day fee)
 * - If distance > 3km: charge distanceKm * 15 (from 1km, no base add-on)
 */
function feeFromDistance(distanceKm: number, within3kmFee: number) {
  const d = Math.max(0, asNum(distanceKm, 0));
  const baseKm = 3;
  const perKm = 15;

  if (d <= baseKm) {
    return { fee: round2(within3kmFee), breakdown: `Up to ${baseKm}km: ₹${round2(within3kmFee)}` };
  }

  const fee = d * perKm;
  return { fee: round2(fee), breakdown: `${round2(d)}km × ₹${perKm}/km = ₹${round2(fee)}` };
}

class DeliveryFeeService {
  private loaded = false;

  private deliveryFeeEnabled = true;
  private within3kmFee = 0;
  private schedule: DeliveryFeeSchedule | null = null;

  private showToCustomer = true;
  calculateDeliveryFeeFromMerchant: any;

  async loadConfig(force = false) {
    if (this.loaded && !force) return;

    const { data, error } = await supabase
      .from('app_settings')
      .select('delivery_fee,delivery_fee_enabled,delivery_fee_schedule,delivery_fee_show_to_customer')
      .single();

    if (error) throw error;

    this.deliveryFeeEnabled = asBool((data as any).delivery_fee_enabled, true);
    this.within3kmFee = Math.max(0, asNum((data as any).delivery_fee, 0));

    const rawSchedule = (data as any).delivery_fee_schedule;
    this.schedule = rawSchedule ? (typeof rawSchedule === 'string' ? JSON.parse(rawSchedule) : rawSchedule) : null;

    this.showToCustomer = asBool((data as any).delivery_fee_show_to_customer, true);

    this.loaded = true;
  }

  private todayGate(now = new Date()) {
    if (!this.deliveryFeeEnabled) {
      return { enabled: false, within3kmFee: this.within3kmFee, reason: 'Delivery fee disabled' };
    }

    const tz = String(this.schedule?.timezone || 'Asia/Kolkata');
    const day = getDayKey(now, tz);
    const rule = (this.schedule?.weekly as any)?.[day] ?? null;

    const dayEnabled = rule?.enabled !== false; // default true
    const dayFee = Math.max(0, asNum(rule?.fee, this.within3kmFee));

    if (!dayEnabled) {
      return { enabled: false, within3kmFee: dayFee, reason: `Disabled for ${day.toUpperCase()}` };
    }

    return { enabled: true, within3kmFee: dayFee, reason: `Enabled for ${day.toUpperCase()}` };
  }

  async quoteFromCoords(params: {
    merchantLat: number;
    merchantLon: number;
    customerLat: number;
    customerLon: number;
  }): Promise<DeliveryFeeQuote> {
    await this.loadConfig();

    const gate = this.todayGate(new Date());
    if (!gate.enabled) {
      return {
        enabled: false,
        showToCustomer: this.showToCustomer,
        distanceKm: 0,
        fee: 0,
        breakdown: gate.reason,
        used: 'none',
      };
    }

    const { merchantLat, merchantLon, customerLat, customerLon } = params;
    const ok = [merchantLat, merchantLon, customerLat, customerLon].every((n) => Number.isFinite(Number(n)));
    if (!ok) {
      return {
        enabled: true,
        showToCustomer: this.showToCustomer,
        distanceKm: 0,
        fee: 0,
        breakdown: 'Missing coordinates',
        used: 'none',
      };
    }

    // Road first
    try {
      const roadKm = await getRoadDistanceKmViaApi(merchantLat, merchantLon, customerLat, customerLon);
      const priced = feeFromDistance(roadKm, gate.within3kmFee);
      return {
        enabled: true,
        showToCustomer: this.showToCustomer,
        distanceKm: round2(roadKm),
        fee: priced.fee,
        breakdown: `Road distance • ${priced.breakdown}`,
        used: 'road',
      };
    } catch {
      // Aerial fallback
      const aerialKm = haversineKm(merchantLat, merchantLon, customerLat, customerLon);
      const priced = feeFromDistance(aerialKm, gate.within3kmFee);
      return {
        enabled: true,
        showToCustomer: this.showToCustomer,
        distanceKm: round2(aerialKm),
        fee: priced.fee,
        breakdown: `Aerial fallback • ${priced.breakdown}`,
        used: 'aerial',
      };
    }
  }
}

export const deliveryFeeService = new DeliveryFeeService();
export default deliveryFeeService;
