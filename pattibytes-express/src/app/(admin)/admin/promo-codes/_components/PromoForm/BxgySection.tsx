'use client';
import { Gift, X } from 'lucide-react';
import type { PromoFormState, MenuItemLite, BxgyDiscType, BxgySelection } from '../../_types';

interface Props {
  form      : PromoFormState;
  buyItems  : MenuItemLite[];
  getItems  : MenuItemLite[];
  update    (patch: Partial<PromoFormState>): void;
  onPickBuy (): void;
  onPickGet (): void;
  onRemove  (id: string, side: 'bxgy_buy' | 'bxgy_get'): void;
}

function Chip({ it, onRemove }: { it: MenuItemLite; onRemove(): void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-semibold text-gray-800">
      <span className="truncate max-w-[160px]">{it.name}</span>
      <span className="text-gray-400">₹{it.price}</span>
      <button type="button" onClick={onRemove}
        className="w-4 h-4 rounded bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center flex-shrink-0">
        <X size={9}/>
      </button>
    </span>
  );
}

const inp = 'w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white';

export function BxgySection({ form, buyItems, getItems, update, onPickBuy, onPickGet, onRemove }: Props) {
  const preview = (() => {
    const buy = form.bxgy_buy_qty;
    const get = form.bxgy_get_qty;
    const dt  = form.bxgy_get_discount_type;
    const dv  = Number(form.bxgy_get_discount_value || 0);
    const disc = dt === 'free' ? '🆓 Free' : dt === 'percentage' ? `${dv}% off` : `₹${dv} off`;
    return `Buy ${buy} → Get ${get} (${disc}) · Max ${form.bxgy_max_sets_per_order} sets`;
  })();

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Gift size={16} className="text-purple-600"/>
        <div>
          <p className="text-xs font-bold text-purple-700 uppercase">Buy X Get Y (BOGO) Configuration</p>
          <p className="text-xs text-purple-500 font-semibold">{preview}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Buy Qty *</label>
          <input type="number" value={form.bxgy_buy_qty}
            onChange={e => update({ bxgy_buy_qty: Number(e.target.value) })}
            className={inp} min={1}/>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Get Qty *</label>
          <input type="number" value={form.bxgy_get_qty}
            onChange={e => update({ bxgy_get_qty: Number(e.target.value) })}
            className={inp} min={1}/>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Max Sets / Order</label>
          <input type="number" value={form.bxgy_max_sets_per_order}
            onChange={e => update({ bxgy_max_sets_per_order: Number(e.target.value) })}
            className={inp} min={1}/>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Get Discount Type</label>
          <select value={form.bxgy_get_discount_type}
            onChange={e => update({ bxgy_get_discount_type: e.target.value as BxgyDiscType })}
            className={inp}>
            <option value="free">Free (100%)</option>
            <option value="percentage">Percentage (%) off</option>
            <option value="fixed">Fixed (₹) off</option>
          </select>
        </div>
        <div className={form.bxgy_get_discount_type === 'free' ? 'opacity-40 pointer-events-none' : ''}>
          <label className="text-xs font-bold text-gray-600 mb-1 block">
            Discount Value{form.bxgy_get_discount_type !== 'free' ? ' *' : ''}
          </label>
          <input type="number" value={form.bxgy_get_discount_value}
            onChange={e => update({ bxgy_get_discount_value: e.target.value })}
            className={inp} min={0} step="0.01"/>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Selection Mode</label>
          <select value={form.bxgy_selection}
            onChange={e => update({ bxgy_selection: e.target.value as BxgySelection })}
            className={inp}>
            <option value="auto_cheapest">Auto (cheapest item free)</option>
            <option value="customer_choice">Customer picks free item</option>
          </select>
        </div>
      </div>

      {/* Buy / Get item selectors */}
      <div className="grid lg:grid-cols-2 gap-3">
        {/* Buy side */}
        <div className="bg-white rounded-xl border border-purple-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">🛒 Buy Items *</p>
            <button type="button" onClick={onPickBuy}
              className="px-2.5 py-1 text-xs font-bold border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-600 hover:text-white transition-all">
              + Pick
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {buyItems.length === 0
              ? <p className="text-xs text-gray-400">Select items that qualify as &quot;Buy&quot;</p>
              : buyItems.map(it => <Chip key={it.id} it={it} onRemove={() => onRemove(it.id, 'bxgy_buy')}/>)}
          </div>
        </div>

        {/* Get side */}
        <div className="bg-white rounded-xl border border-purple-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-700">🎁 Get Items *</p>
            <button type="button" onClick={onPickGet}
              className="px-2.5 py-1 text-xs font-bold border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-600 hover:text-white transition-all">
              + Pick
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {getItems.length === 0
              ? <p className="text-xs text-gray-400">Select items eligible as &ldquo;Get&quot; (discounted)</p>
              : getItems.map(it => <Chip key={it.id} it={it} onRemove={() => onRemove(it.id, 'bxgy_get')}/>)}
          </div>
        </div>
      </div>
    </div>
  );
}
