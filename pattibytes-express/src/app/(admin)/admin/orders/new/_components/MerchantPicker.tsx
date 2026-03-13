import { Store, MapPin, Percent } from 'lucide-react';
import type { MerchantRow } from './types';

interface Props {
  merchants: MerchantRow[];
  merchantId: string;
  setMerchantId: (id: string) => void;
  merchant: MerchantRow | null;
}

export function MerchantPicker({ merchants, merchantId, setMerchantId, merchant }: Props) {
  return (
    <div className="bg-gradient-to-br from-white to-orange-50 rounded-2xl shadow-sm border border-orange-100 p-5 space-y-3">
      <h2 className="font-bold text-gray-900 flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center">
          <Store className="w-4 h-4 text-white" />
        </span>
        Merchant
      </h2>

      <select
        value={merchantId}
        onChange={e => setMerchantId(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200
                   focus:ring-2 focus:ring-primary focus:border-primary
                   bg-white font-medium text-sm transition"
      >
        <option value="">🔍 Select merchant…</option>
        {merchants.map(m => (
          <option key={m.id} value={m.id}>
            {m.business_name || m.id.slice(0, 8)}
            {m.city ? ` • ${m.city}` : ''}
            {m.gst_enabled ? ' • GST' : ''}
          </option>
        ))}
      </select>

      {merchant?.address && (
        <div className="flex items-start gap-2 p-3 bg-white rounded-xl border text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          {merchant.address}
        </div>
      )}

      {merchant?.gst_enabled && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-sm font-semibold text-green-800">
          <Percent className="w-4 h-4 text-green-600" />
          GST Enabled: {merchant.gst_percentage}%
        </div>
      )}
    </div>
  );
}
