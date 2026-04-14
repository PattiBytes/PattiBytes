export const ROLE_BADGE: Record<string, string> = {
  customer:   'bg-blue-100 text-blue-800',
  merchant:   'bg-orange-100 text-orange-800',
  driver:     'bg-green-100 text-green-800',
  admin:      'bg-purple-100 text-purple-800',
  superadmin: 'bg-red-100 text-red-800',
  unknown:    'bg-gray-100 text-gray-800',
};

export function roleBadge(role: string | null | undefined): string {
  const r = (role || 'unknown').toLowerCase();
  return ROLE_BADGE[r] ?? ROLE_BADGE.unknown;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function statusBadge(status: string | null | undefined): string {
  const s = (status || '').toLowerCase();
  if (['approved', 'active'].includes(s)) return 'bg-green-100 text-green-700';
  if (['pending'].includes(s)) return 'bg-yellow-100 text-yellow-700';
  if (['rejected', 'revoked', 'banned', 'suspended'].includes(s)) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}