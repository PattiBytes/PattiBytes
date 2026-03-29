import type { AddressRow, NotificationPrefs } from "./types";

export function safeNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function safeBool(v: any, fallback = false): boolean {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export function parsePrefs(v: any): NotificationPrefs {
  const base: NotificationPrefs = {
    promos: true,
    system: true,
    order_updates: true,
  };
  if (!v) return base;
  if (typeof v === "object") return { ...base, ...v };
  if (typeof v === "string") {
    try {
      const o = JSON.parse(v);
      if (o && typeof o === "object") return { ...base, ...o };
    } catch {}
  }
  return base;
}

export function normalizeAddress(a: AddressRow) {
  return {
    id: String(a.id),
    label: (a.label ?? "Address").trim(),
    recipientName: String(a.recipient_name ?? "").trim() || null,
    recipientPhone: String(a.recipient_phone ?? "").trim() || null,
    address: (a.address ?? "").trim(),
    apartmentFloor: String(a.apartment_floor ?? "").trim() || null,
    landmark: (a.landmark ?? "").trim() || null,
    latitude: a.latitude ?? null,
    longitude: a.longitude ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postalCode: String(a.postal_code ?? "").trim() || null,
    isDefault: safeBool((a as any).is_default, false),
    deliveryInstructions: String(a.delivery_instructions ?? "").trim() || null,
    createdAt: a.created_at ?? null,
    updatedAt: a.updated_at ?? null,
  };
}

export type NormalizedAddress = ReturnType<typeof normalizeAddress>;

export function moneyINR(n: any): string {
  const x = safeNum(n, 0);
  try {
    return `₹${Math.round(x).toLocaleString("en-IN")}`;
  } catch {
    return `₹${Math.round(x)}`;
  }
}