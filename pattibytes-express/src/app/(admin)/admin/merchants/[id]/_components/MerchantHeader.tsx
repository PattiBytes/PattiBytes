'use client';

import { ArrowLeft, RefreshCw, Save, Loader2, BadgeCheck, Star, CircleOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { MerchantRow } from './types';

interface Props {
  merchant: MerchantRow | null;
  merchantId: string;
  saving: boolean;
  canSave: boolean;
  onRefresh: () => void;
  onSave: () => void;
}

export function MerchantHeader({ merchant, merchantId, saving, canSave, onRefresh, onSave }: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5 min-w-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-100 shrink-0 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 min-w-0">
          {merchant?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={merchant.logo_url}
              alt=""
              className="w-10 h-10 rounded-xl object-cover border shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                {merchant?.business_name ?? 'Merchant'}
              </h1>
              {merchant?.is_verified && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
              )}
              {merchant?.is_featured && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                  <Star className="w-3 h-3" /> Featured
                </span>
              )}
              {merchant?.is_active === false && (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                  <CircleOff className="w-3 h-3" /> Inactive
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 font-mono truncate">{merchantId}</p>
          </div>
        </div>
      </div>

      <div className="lg:ml-auto flex gap-2 flex-wrap shrink-0">
        <button
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canSave}
          className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 shadow text-sm font-semibold transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
