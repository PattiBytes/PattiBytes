'use client';
import { useEffect, useState } from 'react';
import { Tag, Gift, Zap, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cx, toINR, type PromoCodeRow, type BxgyTarget } from './types';

interface Props {
  promoCode: string | null;
  promoId:   string | null;
  discount:  number;
}

function DealTypeBadge({ type }: { type: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map: Record<string, { label: string; color: string; icon: any }> = {
    bxgy:       { label: 'Buy X Get Y', color: 'bg-pink-100 text-pink-700 border-pink-200',   icon: Gift },
    percentage: { label: '% Off',       color: 'bg-orange-100 text-orange-700 border-orange-200', icon: Tag },
    flat:       { label: 'Flat Off',    color: 'bg-blue-100 text-blue-700 border-blue-200',    icon: Zap  },
  };
  const m = map[type] ?? { label: type, color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Tag };
  const Icon = m.icon;
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border', m.color)}>
      <Icon className="w-3 h-3" /> {m.label}
    </span>
  );
}

export function PromoInfoPanel({ promoCode, promoId, discount }: Props) {
  const [promo, setPromo] = useState<PromoCodeRow | null>(null);
  const [targets, setTargets] = useState<BxgyTarget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!promoCode && !promoId) return;
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoCode, promoId]);

  const load = async () => {
    setLoading(true);
    try {
      let q = supabase.from('promo_codes').select('*');
      if (promoId)   q = q.eq('id', promoId);
      else if (promoCode) q = q.eq('code', promoCode);
      const { data } = await q.maybeSingle();
      if (!data) return;

      setPromo(data as PromoCodeRow);

      // If bxgy, load targets
      if (data.deal_type === 'bxgy') {
        const { data: tgts } = await supabase
          .from('promo_bxgy_targets')
          .select('*')
          .eq('promo_code_id', data.id);
        setTargets((tgts as BxgyTarget[]) || []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  if (!promoCode && !promoId) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 sm:p-6">
      <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
        <Tag className="w-5 h-5 text-amber-500" /> Promo Code
      </h3>

      {/* Code badge */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <span className="font-black text-lg text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200 tracking-widest">
          🏷 {promoCode}
        </span>
        {promo?.deal_type && <DealTypeBadge type={promo.deal_type} />}
        {promo?.auto_apply && (
          <span className="text-xs bg-green-100 text-green-700 border border-green-200 font-bold px-2.5 py-1 rounded-full">
            Auto-applied
          </span>
        )}
        {promo?.is_active === false && (
          <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 font-bold px-2.5 py-1 rounded-full">
            Inactive
          </span>
        )}
      </div>

      {loading && <p className="text-xs text-gray-400">Loading promo details…</p>}

      {promo && !loading && (
        <div className="space-y-2">
          {promo.description && (
            <p className="text-sm text-gray-700">{promo.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            {promo.discount_type && (
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="font-semibold text-gray-500">Discount</p>
                <p className="font-bold text-gray-900">
                  {promo.discount_type === 'percentage'
                    ? `${promo.discount_value}%`
                    : toINR(promo.discount_value ?? 0)}
                </p>
              </div>
            )}
            {promo.min_order_amount && (
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="font-semibold text-gray-500">Min Order</p>
                <p className="font-bold text-gray-900">{toINR(promo.min_order_amount)}</p>
              </div>
            )}
            {discount > 0 && (
              <div className="bg-green-50 rounded-xl p-2">
                <p className="font-semibold text-green-700">Saved on this order</p>
                <p className="font-bold text-green-800">{toINR(discount)}</p>
              </div>
            )}
            {promo.scope && (
              <div className="bg-gray-50 rounded-xl p-2">
                <p className="font-semibold text-gray-500">Scope</p>
                <p className="font-bold text-gray-900 capitalize">{promo.scope}</p>
              </div>
            )}
          </div>

          {/* BxGy deal details */}
          {promo.deal_type === 'bxgy' && promo.deal_json && (() => {
            const dj = typeof promo.deal_json === 'string'
              ? JSON.parse(promo.deal_json) : promo.deal_json;
            return (
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 mt-2">
                <p className="text-xs font-bold text-pink-900 mb-2 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> Buy One Get One Free — Deal Details
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-lg p-2 border border-pink-100">
                    <p className="font-bold text-gray-500">Buy</p>
                    <p className="font-black text-gray-900">Qty: {dj?.buy?.qty ?? '?'}</p>
                    {dj?.selection && (
                      <p className="text-gray-500 capitalize mt-0.5">
                        Selection: {String(dj.selection).replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-2 border border-pink-100">
                    <p className="font-bold text-gray-500">Get</p>
                    <p className="font-black text-gray-900">Qty: {dj?.get?.qty ?? '?'}</p>
                    {dj?.get?.discount?.type && (
                      <p className="text-green-700 font-bold">
                        {dj.get.discount.type === 'free'
                          ? '✓ Free'
                          : `${dj.get.discount.value}% off`}
                      </p>
                    )}
                  </div>
                </div>
                {dj?.max_sets_per_order && (
                  <p className="text-xs text-pink-800 mt-2">
                    Max {dj.max_sets_per_order} sets per order
                  </p>
                )}
              </div>
            );
          })()}

          {/* BxGy target items */}
          {targets.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-bold text-gray-500 mb-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Eligible Items
              </p>
              <div className="flex flex-wrap gap-1.5">
                {targets.map(t => (
                  <span key={t.id}
                    className={cx(
                      'text-xs px-2.5 py-1 rounded-full font-semibold border',
                      t.side === 'buy'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    )}
                  >
                    {t.side === 'buy' ? '🛒' : '🎁'} {t.menu_item_name ?? t.menu_item_id.slice(0, 8)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Validity */}
          {(promo.valid_from || promo.valid_until) && (
            <p className="text-xs text-gray-400 mt-2">
              Valid:
              {promo.valid_from ? ` from ${new Date(promo.valid_from).toLocaleDateString('en-IN')}` : ''}
              {promo.valid_until ? ` until ${new Date(promo.valid_until).toLocaleDateString('en-IN')}` : ''}
            </p>
          )}
        </div>
      )}

      {!promo && !loading && (
        <p className="text-xs text-gray-400">
          Code <strong>{promoCode}</strong> applied — details unavailable
        </p>
      )}
    </div>
  );
}
