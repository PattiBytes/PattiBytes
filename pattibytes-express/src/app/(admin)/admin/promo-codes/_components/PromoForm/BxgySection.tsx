'use client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Gift, X, ShoppingCart, Info, Zap, User2, Leaf, Beef } from 'lucide-react';
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

const inp = 'w-full px-3 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 bg-white';

/* ── Veg / Non-veg dot ─────────────────────────────────────────────────── */
function VegDot({ isVeg }: { isVeg: boolean | null | undefined }) {
  if (isVeg === null || isVeg === undefined) return null;
  return (
    <span
      title={isVeg ? 'Veg' : 'Non-veg'}
      className={`inline-flex items-center justify-center w-4 h-4 rounded border text-[9px] flex-shrink-0
        ${isVeg
          ? 'border-green-600 text-green-600'
          : 'border-red-600 text-red-600'}`}
    >
      {isVeg ? <Leaf size={9} /> : <Beef size={9} />}
    </span>
  );
}

/* ── Effective price (after item-level discount) ───────────────────────── */
function effectivePrice(it: MenuItemLite): number {
  if (!it.discount_percentage) return it.price;
  return it.price * (1 - it.discount_percentage / 100);
}

/* ── Single item row in the selected-items table ──────────────────────── */
function ItemRow({
  it,
  rowClass,
  onRemove,
  label,
}: {
  it       : MenuItemLite;
  rowClass : string;
  onRemove (): void;
  label    : 'buy' | 'get';
}) {
  const effPrice = effectivePrice(it);
  const hasDiscount = !!it.discount_percentage && it.discount_percentage > 0;

  return (
    <tr className={`text-xs border-b last:border-0 ${rowClass}`}>
      {/* Veg / non-veg + name */}
      <td className="py-2 pl-3 pr-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <VegDot isVeg={it.is_veg} />
          <span className="font-semibold text-gray-800 truncate max-w-[160px]">{it.name}</span>
        </div>
        {it.description && (
          <p className="text-gray-400 truncate max-w-[180px] mt-0.5 pl-5">{it.description}</p>
        )}
      </td>

      {/* Category */}
      <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
        {it.category ?? <span className="text-gray-300">—</span>}
      </td>

      {/* Price */}
      <td className="py-2 px-2 text-right whitespace-nowrap">
        {hasDiscount ? (
          <span className="flex flex-col items-end gap-0">
            <span className="text-gray-400 line-through text-[10px]">₹{it.price.toFixed(2)}</span>
            <span className="font-bold text-green-700">₹{effPrice.toFixed(2)}</span>
          </span>
        ) : (
          <span className="font-semibold text-gray-800">₹{it.price.toFixed(2)}</span>
        )}
      </td>

      {/* What the deal does to this item */}
      <td className="py-2 px-2 text-center">
        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px]
          ${label === 'buy'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-green-100 text-green-700'}`}>
          {label === 'buy' ? '🛒 BUY' : '🎁 GET'}
        </span>
      </td>

      {/* Remove */}
      <td className="py-2 pr-3 pl-1">
        <button
          type="button"
          onClick={onRemove}
          title="Remove"
          className="w-5 h-5 flex items-center justify-center rounded bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all flex-shrink-0"
        >
          <X size={10} />
        </button>
      </td>
    </tr>
  );
}

/* ── Empty state for a side ───────────────────────────────────────────── */
function EmptyRows({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-4 text-xs text-gray-400 italic">{msg}</td>
    </tr>
  );
}

/* ── Section header row (colspan) ─────────────────────────────────────── */
function SectionHeader({
  label,
  count,
  colorClass,
  onPick,
}: {
  label      : string;
  count      : number;
  colorClass : string;
  onPick     (): void;
}) {
  return (
    <tr>
      <td colSpan={4} className={`py-2 pl-3 ${colorClass} font-bold text-xs`}>
        {label}
        {count > 0 && (
          <span className="ml-2 px-1.5 py-0.5 bg-white/60 rounded-full text-[10px] font-bold">
            {count} item{count !== 1 ? 's' : ''}
          </span>
        )}
      </td>
      <td className="py-2 pr-3 text-right">
        <button
          type="button"
          onClick={onPick}
          className={`px-2.5 py-1 text-[11px] font-bold border rounded-lg transition-all
            ${colorClass.includes('blue')
              ? 'border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white'
              : 'border-green-300 text-green-700 hover:bg-green-600 hover:text-white'}`}
        >
          + Pick
        </button>
      </td>
    </tr>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Main BxgySection
══════════════════════════════════════════════════════════════════════════ */
export function BxgySection({ form, buyItems, getItems, update, onPickBuy, onPickGet, onRemove }: Props) {

  const isCustomerChoice = form.bxgy_selection === 'customer_choice';

  const preview = (() => {
    const buy = form.bxgy_buy_qty;
    const get = form.bxgy_get_qty;
    const dt  = form.bxgy_get_discount_type;
    const dv  = Number(form.bxgy_get_discount_value || 0);
    const disc = dt === 'free' ? '🆓 Free' : dt === 'percentage' ? `${dv}% off` : `₹${dv} off`;
    return `Buy any ${buy} item${buy !== 1 ? 's' : ''} → Get ${get} item${get !== 1 ? 's' : ''} (${disc}) · Max ${form.bxgy_max_sets_per_order} set${form.bxgy_max_sets_per_order !== 1 ? 's' : ''} per order`;
  })();

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-start gap-2">
        <Gift size={16} className="text-purple-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">
            Buy X Get Y (BOGO) Configuration
          </p>
          <p className="text-xs text-purple-500 font-semibold mt-0.5">{preview}</p>
        </div>
      </div>

      {/* ── Config fields ── */}
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Buy Qty *</label>
          <input
            type="number" value={form.bxgy_buy_qty} min={1}
            onChange={e => update({ bxgy_buy_qty: Number(e.target.value) })}
            className={inp}
          />
          <p className="text-xs text-gray-400 mt-0.5">Customer must buy this many</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Get Qty *</label>
          <input
            type="number" value={form.bxgy_get_qty} min={1}
            onChange={e => update({ bxgy_get_qty: Number(e.target.value) })}
            className={inp}
          />
          <p className="text-xs text-gray-400 mt-0.5">Customer receives this many</p>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Max Sets / Order</label>
          <input
            type="number" value={form.bxgy_max_sets_per_order} min={1}
            onChange={e => update({ bxgy_max_sets_per_order: Number(e.target.value) })}
            className={inp}
          />
          <p className="text-xs text-gray-400 mt-0.5">Max times deal applies per order</p>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Get Discount Type</label>
          <select
            value={form.bxgy_get_discount_type}
            onChange={e => update({ bxgy_get_discount_type: e.target.value as BxgyDiscType })}
            className={inp}
          >
            <option value="free">🆓 Free (100%)</option>
            <option value="percentage">📉 Percentage (%) off</option>
            <option value="fixed">💰 Fixed (₹) off</option>
          </select>
        </div>

        <div className={form.bxgy_get_discount_type === 'free' ? 'opacity-40 pointer-events-none' : ''}>
          <label className="text-xs font-bold text-gray-600 mb-1 block">
            Discount Value{form.bxgy_get_discount_type !== 'free' ? ' *' : ''}
          </label>
          <input
            type="number" value={form.bxgy_get_discount_value} min={0} step="0.01"
            onChange={e => update({ bxgy_get_discount_value: e.target.value })}
            className={inp}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 mb-1 block">Selection Mode</label>
          <select
            value={form.bxgy_selection}
            onChange={e => update({ bxgy_selection: e.target.value as BxgySelection })}
            className={inp}
          >
            <option value="auto_cheapest">⚡ Auto — cheapest item(s) free</option>
            <option value="customer_choice">👤 Customer picks their free item(s)</option>
          </select>
        </div>
      </div>

      {/* ── Selection mode info banner ── */}
      {isCustomerChoice ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex gap-2 items-start">
          <User2 size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-bold">Customer Choice Mode</p>
            <p className="mt-0.5 text-blue-600">
              After qualifying by buying the required items, the customer sees a
              <strong> &quot;Pick Your Free Item&quot;</strong> screen in the app. They can choose
              any <strong>{form.bxgy_get_qty}</strong> item(s) from your <em>Get Items</em> list below.
              The app enforces max <strong>{form.bxgy_max_sets_per_order}</strong> free set(s) per order.
            </p>
            <p className="mt-1 text-blue-500">
              📌 The <em>Buy Items</em> list defines which items trigger the deal.
              The <em>Get Items</em> list defines what the customer can choose as their reward.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex gap-2 items-start">
          <Zap size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-700">
            <p className="font-bold">Auto (Cheapest) Mode</p>
            <p className="mt-0.5 text-amber-600">
              The app automatically selects the cheapest qualifying item(s) from the
              <em> Get Items</em> pool and applies the discount — no customer action needed.
              Best for BOGO offers where you want zero friction.
            </p>
          </div>
        </div>
      )}

      {/* ══ Combined Buy + Get Item Table ══════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-purple-50 border-b border-purple-100 text-gray-500 uppercase tracking-wide text-[10px]">
              <th className="py-2 pl-3 pr-2 text-left font-bold w-[44%]">Item</th>
              <th className="py-2 px-2 text-left font-bold w-[18%]">Category</th>
              <th className="py-2 px-2 text-right font-bold w-[16%]">Price</th>
              <th className="py-2 px-2 text-center font-bold w-[12%]">Role</th>
              <th className="py-2 pr-3 pl-1 w-[10%]"></th>
            </tr>
          </thead>
          <tbody>
            {/* ── BUY section ── */}
            <SectionHeader
              label="🛒 Buy Items"
              count={buyItems.length}
              colorClass="text-blue-700 bg-blue-50"
              onPick={onPickBuy}
            />
            {buyItems.length === 0
              ? <EmptyRows cols={5} msg='No "Buy" items selected — click + Pick to add items' />
              : buyItems.map(it => (
                  <ItemRow
                    key={it.id}
                    it={it}
                    rowClass="hover:bg-blue-50/40 transition-colors"
                    label="buy"
                    onRemove={() => onRemove(it.id, 'bxgy_buy')}
                  />
                ))
            }

            {/* ── GET section ── */}
            <SectionHeader
              label={isCustomerChoice ? '🎁 Get Items (Customer Picks From These)' : '🎁 Get Items (Auto-selected)'}
              count={getItems.length}
              colorClass="text-green-700 bg-green-50"
              onPick={onPickGet}
            />
            {getItems.length === 0
              ? <EmptyRows
                  cols={5}
                  msg={isCustomerChoice
                    ? 'Add items here — customer will pick their free item from this list'
                    : 'Add items here — cheapest one(s) will be discounted automatically'}
                />
              : getItems.map(it => (
                  <ItemRow
                    key={it.id}
                    it={it}
                    rowClass="hover:bg-green-50/40 transition-colors"
                    label="get"
                    onRemove={() => onRemove(it.id, 'bxgy_get')}
                  />
                ))
            }
          </tbody>
        </table>

        {/* ── Totals footer ── */}
        {(buyItems.length > 0 || getItems.length > 0) && (
          <div className="bg-purple-50 border-t border-purple-100 px-3 py-2 flex items-center justify-between text-xs text-purple-700">
            <span>
              <span className="font-bold">{buyItems.length}</span> buy item{buyItems.length !== 1 ? 's' : ''} ·{' '}
              <span className="font-bold">{getItems.length}</span> get item{getItems.length !== 1 ? 's' : ''}
            </span>
            <span className="text-purple-500">
              {isCustomerChoice
                ? `Customer selects ${form.bxgy_get_qty} from ${getItems.length} eligible item${getItems.length !== 1 ? 's' : ''}`
                : `System picks cheapest ${form.bxgy_get_qty} from get pool`}
            </span>
          </div>
        )}
      </div>

      {/* ── Validation hints ── */}
      {buyItems.length === 0 && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <Info size={11} /> At least 1 Buy item is required to save this offer.
        </p>
      )}
      {getItems.length === 0 && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <Info size={11} /> At least 1 Get item is required to save this offer.
        </p>
      )}
      {isCustomerChoice && getItems.length > 0 && getItems.length < form.bxgy_get_qty && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <Info size={11} />
          Get qty ({form.bxgy_get_qty}) is more than available Get items ({getItems.length}).
          Add more Get items or reduce Get qty.
        </p>
      )}
    </div>
  );
}