// src/app/(admin)/admin/analytics/_components/types.ts

export type TimeRange = 'week' | 'month' | 'year';

export interface RevenueDay {
  day: string;
  revenue: number;
  orders: number;
}

export interface AnalyticsData {
  // ── Platform ──────────────────────────────────────────────────
  totalUsers: number;
  totalMerchants: number;
  totalDrivers: number;
  activeUsers: number;
  newUsersThisPeriod: number;
  pendingAccessRequests: number;

  // ── Revenue & Orders ──────────────────────────────────────────
  totalRevenue: number;
  totalOrders: number;
  growth: number;
  revenueGrowth: number;
  avgOrderValue: number;
  fulfillmentRate: number;
  cancellationRate: number;
  avgPrepTime: number;
  avgDeliveryDistance: number;

  // ── Revenue Breakdown ─────────────────────────────────────────
  breakdown: {
    subtotal: number;
    deliveryFee: number;
    tax: number;
    discount: number;
  };

  // ── Order Dimensions ──────────────────────────────────────────
  ordersByStatus: { pending: number; processing: number; delivered: number; cancelled: number };
  ordersByPayment: Array<{ method: string; count: number; amount: number }>;
  ordersByType: Array<{ type: string; count: number }>;
  vegNonVeg: { veg: number; nonVeg: number };

  // ── Time-Series ───────────────────────────────────────────────
  revenueByDay: RevenueDay[];
  ordersByHour: Array<{ hour: number; count: number }>;

  // ── Leaderboards ─────────────────────────────────────────────
  topMerchants: Array<{ id: string; name: string; revenue: number; orders: number }>;
  topDrivers: Array<{ id: string; name: string; deliveries: number }>;

  // ── Notifications ─────────────────────────────────────────────
  totalNotifications: number;
  notifReadRate: number;
  notifPushRate: number;
  notifByType: Array<{ type: string; count: number }>;

  // ── Reviews ──────────────────────────────────────────────────
  totalReviews: number;
  avgOverallRating: number;
  avgFoodRating: number;
  avgDeliveryRating: number;
  ratingDistribution: number[]; // index 0 = 1-star … index 4 = 5-star

  // ── Cancellations ─────────────────────────────────────────────
  topCancellationReasons: Array<{ reason: string; count: number }>;

  // ── Custom Orders ─────────────────────────────────────────────
  pendingCustomOrders: number;
  customOrdersByCategory: Array<{ category: string; count: number }>;
}

export const EMPTY_ANALYTICS: AnalyticsData = {
  totalUsers: 0, totalMerchants: 0, totalDrivers: 0, activeUsers: 0,
  newUsersThisPeriod: 0, pendingAccessRequests: 0,
  totalRevenue: 0, totalOrders: 0, growth: 0, revenueGrowth: 0,
  avgOrderValue: 0, fulfillmentRate: 0, cancellationRate: 0,
  avgPrepTime: 0, avgDeliveryDistance: 0,
  breakdown: { subtotal: 0, deliveryFee: 0, tax: 0, discount: 0 },
  ordersByStatus: { pending: 0, processing: 0, delivered: 0, cancelled: 0 },
  ordersByPayment: [], ordersByType: [], vegNonVeg: { veg: 0, nonVeg: 0 },
  revenueByDay: [], ordersByHour: [],
  topMerchants: [], topDrivers: [],
  totalNotifications: 0, notifReadRate: 0, notifPushRate: 0, notifByType: [],
  totalReviews: 0, avgOverallRating: 0, avgFoodRating: 0, avgDeliveryRating: 0,
  ratingDistribution: [0, 0, 0, 0, 0],
  topCancellationReasons: [],
  pendingCustomOrders: 0, customOrdersByCategory: [],
};