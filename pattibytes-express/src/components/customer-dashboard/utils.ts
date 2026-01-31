/* eslint-disable @typescript-eslint/no-explicit-any */
export function formatCurrencyINR(value: number) {
  const n = Number(value || 0);
  try {
    return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  } catch {
    return `₹${Math.round(n)}`;
  }
}

export function getFirstNameFromUser(user: any) {
  const fullName =
    user?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    '';
  const name = String(fullName || '').trim();
  if (!name) return 'Food Lover';
  return name.split(' ')[0] || 'Food Lover';
}

export function safeText(v: any) {
  return String(v ?? '').trim();
}

export function parseCuisineList(cuisine_types: any): string[] {
  if (!cuisine_types) return [];
  if (Array.isArray(cuisine_types)) return cuisine_types.map(String).map((s) => s.trim()).filter(Boolean);

  // sometimes it can come as stringified JSON
  if (typeof cuisine_types === 'string') {
    const raw = cuisine_types.trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    } catch {
      // fallback: comma-separated
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function normalizeReverseGeocodeToString(result: any): {
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
} {
  if (typeof result === 'string') return { address: result };

  const address = String(result?.address || result?.display_name || result?.formatted_address || '').trim();
  const city = result?.city || result?.town || result?.village || '';
  const state = result?.state || '';
  const postal_code = result?.postal_code || result?.postalcode || '';

  return { address, city, state, postal_code };
}
