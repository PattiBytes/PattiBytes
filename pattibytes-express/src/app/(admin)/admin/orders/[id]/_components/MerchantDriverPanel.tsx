 
'use client';
import { Store, Truck, Phone, MapPin } from 'lucide-react';
import { type MerchantInfo, type ProfileMini, type OrderNormalized } from './types';

// safeAddrText helper (add to types.ts if missing)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeAddr(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a;
  if (typeof a === 'object') return a.address || a.formatted_address || '';
  return String(a);
}

interface Props {
  order: OrderNormalized;
  merchant: MerchantInfo | null;
  driver: ProfileMini | null;
}

export function MerchantDriverPanel({ order, merchant, driver }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border divide-y">
      {/* Merchant */}
      <div className="p-4 sm:p-6 space-y-2">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" /> Merchant
        </h3>
        {merchant ? (
          <>
            <p className="font-bold text-gray-900">
              {merchant.business_name ?? merchant.businessname ?? 'N/A'}
            </p>
            {merchant.phone && (
              <a href={`tel:${merchant.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Phone className="w-4 h-4 text-gray-400" /> {merchant.phone}
              </a>
            )}
            {merchant.address && (
              <p className="flex items-start gap-2 text-xs text-gray-500">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {safeAddr(merchant.address)}
              </p>
            )}
            {merchant.email && (
              <p className="text-xs text-gray-400">{merchant.email}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500">Merchant info unavailable</p>
        )}
      </div>

      {/* Driver */}
      <div className="p-4 sm:p-6 space-y-2">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-500" /> Driver
        </h3>
        {driver && order.driverId ? (
          <>
            <p className="font-bold text-gray-900">
              {driver.full_name ?? driver.fullname ?? 'Driver'}
            </p>
            {driver.phone && (
              <a href={`tel:${driver.phone}`}
                className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Phone className="w-4 h-4 text-gray-400" /> {driver.phone}
              </a>
            )}
            {driver.email && (
              <p className="text-xs text-gray-400">{driver.email}</p>
            )}
          </>
        ) : order.driverId ? (
          <p className="text-sm text-gray-500">Driver details loading…</p>
        ) : (
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800">⏳ No driver assigned yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
