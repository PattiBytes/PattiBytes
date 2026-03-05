// src/components/custom-orders/helpers.ts
export const CATEGORIES = [
  { id: 'food',       label: 'Food Items', emoji: '🍱', desc: 'Restaurant meals, snacks' },
  { id: 'grocery',    label: 'Grocery',    emoji: '🛒', desc: 'Vegetables, fruits, staples' },
  { id: 'dairy',      label: 'Dairy',      emoji: '🥛', desc: 'Milk, paneer, curd, butter' },
  { id: 'medicines',  label: 'Medicines',  emoji: '💊', desc: 'Prescription & OTC medicines' },
  { id: 'bakery',     label: 'Bakery',     emoji: '🎂', desc: 'Custom cakes, pastries' },
  { id: 'stationery', label: 'Stationery', emoji: '✏️', desc: 'Books, pens, supplies' },
  { id: 'other',      label: 'Other',      emoji: '📦', desc: 'Anything else you need' },
];

export const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  dairy:      { bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:    { bg: '#D1FAE5', text: '#065F46' },
  medicines:  { bg: '#FEE2E2', text: '#991B1B' },
  food:       { bg: '#FEF3C7', text: '#92400E' },
  bakery:     { bg: '#FCE7F3', text: '#9D174D' },
  stationery: { bg: '#EDE9FE', text: '#5B21B6' },
  other:      { bg: '#F3F4F6', text: '#374151' },
};

export function getCatInfo(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? { emoji: '📦', label: id, desc: '' };
}

export function getCatColors(cat: string) {
  return CAT_COLORS[cat] ?? { bg: '#F3F4F6', text: '#374151' };
}

export function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return d;
  }
}

// snake_case to match saved_addresses table
export function formatSavedAddress(a: {
  address: string;
  apartment_floor?: string | null;
  landmark?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
}): string {
  return [
    a.address,
    a.apartment_floor ? `Flat/Floor ${a.apartment_floor}` : null,
    a.landmark ? `Near ${a.landmark}` : null,
    a.city,
    a.state,
    a.postal_code,
  ].filter(Boolean).join(', ');
}

// Generates ref like PBX-CUST-A3F2
export function generateCustomRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'PBX-CUST-';
  for (let i = 0; i < 4; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}
