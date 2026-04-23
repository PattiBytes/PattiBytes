/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { X, Send, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { CartDiscountSection } from './CartDiscountSection';
import { BxgySection }         from './BxgySection';
import { TimingSection }       from './TimingSection';
import { SecretPromoSection }  from './SecretPromoSection';
import { MenuPickerPanel }     from './MenuPickerPanel';
import type {
  PromoCodeRow, PromoFormState, MerchantLite, CustomerLite,
  PromoScope, DealType, MenuItemLite,
} from '../../_types';
import { useMenuPicker } from '../../_hooks/useMenuPicker';

function num(v: any, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function toDateStr(iso: string | null | undefined) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

interface Props {
  editTarget   : PromoCodeRow | null;
  merchants    : MerchantLite[];
  customers    : CustomerLite[];
  saving       : boolean;
  isAdmin      : boolean;
  defaultMerId : string;
  initTargets  : MenuItemLite[];
  initBuyItems : MenuItemLite[];
  initGetItems : MenuItemLite[];
  onSubmit(
    form    : PromoFormState,
    targets : MenuItemLite[],
    buy     : MenuItemLite[],
    get     : MenuItemLite[],
    notify  : boolean,
  ): Promise<void>;
  onClose(): void;
}

const BLANK: PromoFormState = {
  code: '', description: '', scope: 'global', merchant_id: '',
  deal_type: 'cart_discount', auto_apply: false, priority: 0,
  discount_type: 'percentage', discount_value: '', min_order_amount: '',
  max_discount_amount: '', usage_limit: '', max_uses_per_user: '',
  valid_from: '', valid_until: '', valid_days: [], start_time: '', end_time: '',
  bxgy_buy_qty: 1, bxgy_get_qty: 1, bxgy_get_discount_type: 'free',
  bxgy_get_discount_value: '', bxgy_max_sets_per_order: 1,
  bxgy_selection: 'auto_cheapest',
  is_secret: false, secret_allowed_users: [], secret_note: '',
};

export function PromoFormModal({
  editTarget, merchants, customers, saving, isAdmin, defaultMerId,
  initTargets, initBuyItems, initGetItems, onSubmit, onClose,
}: Props) {
  const [form,        setForm]        = useState<PromoFormState>(BLANK);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const picker = useMenuPicker();

  // ← ADD THIS BLOCK ↓
useEffect(() => {
  if (initBuyItems.length > 0) picker.setBuyItems(initBuyItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initBuyItems]);

useEffect(() => {
  if (initGetItems.length > 0) picker.setGetItems(initGetItems);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initGetItems]);

useEffect(() => {
  if (initTargets.length > 0) picker.setTargets(initTargets);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [initTargets]);

  // ── Seed form on open / edit ──────────────────────────────────────────────
  useEffect(() => {
    if (!editTarget) {
      const base = { ...BLANK };
      if (!isAdmin) { base.scope = 'merchant'; base.merchant_id = defaultMerId; }
      setForm(base);
      picker.resetAll();
      return;
    }
    const p   = editTarget;
    const deal = (p.deal_json as any) ?? {};
    setForm({
      code                   : p.code         ?? '',
      description            : p.description  ?? '',
      scope                  : (p.scope ?? (p.merchant_id ? 'merchant' : 'global')) as PromoScope,
      merchant_id            : p.merchant_id  ?? '',
      deal_type              : (p.deal_type ?? 'cart_discount') as DealType,
      auto_apply             : !!p.auto_apply,
      priority               : num(p.priority),
      discount_type          : p.discount_type,
      discount_value         : p.discount_value         ?? '',
      min_order_amount       : p.min_order_amount       ?? '',
      max_discount_amount    : p.max_discount_amount    ?? '',
      usage_limit            : p.usage_limit            ?? '',
      max_uses_per_user      : p.max_uses_per_user      ?? '',
      valid_from             : toDateStr(p.valid_from),
      valid_until            : toDateStr(p.valid_until),
      valid_days             : (p.valid_days ?? []) as number[],
      start_time             : p.start_time  ? String(p.start_time).slice(0, 5) : '',
      end_time               : p.end_time    ? String(p.end_time).slice(0, 5)   : '',
      bxgy_buy_qty           : num(deal?.buy?.qty, 1),
      bxgy_get_qty           : num(deal?.get?.qty, 1),
      bxgy_get_discount_type : deal?.get?.discount?.type  ?? 'free',
      bxgy_get_discount_value: deal?.get?.discount?.value ?? '',
      bxgy_max_sets_per_order: num(deal?.max_sets_per_order, 1),
      bxgy_selection         : deal?.selection ?? 'auto_cheapest',
      is_secret              : !!p.is_secret,
      secret_allowed_users   : (p.secret_allowed_users ?? []) as string[],
      secret_note            : p.secret_note ?? '',
    });
    picker.resetAll();
    picker.setTargets(initTargets);
    picker.setBuyItems(initBuyItems);
    picker.setGetItems(initGetItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTarget]);

  const update = (patch: Partial<PromoFormState>) =>
    setForm(prev => ({ ...prev, ...patch }));

  const merchantForPicker = isAdmin
    ? (form.scope === 'global' ? '' : form.merchant_id)
    : defaultMerId;

  // ── Live preview label ────────────────────────────────────────────────────
  const offerPreview = form.deal_type === 'bxgy'
    ? `Buy ${form.bxgy_buy_qty} Get ${form.bxgy_get_qty} ${
        form.bxgy_get_discount_type === 'free'
          ? 'FREE'
          : form.bxgy_get_discount_type === 'percentage'
            ? `(${form.bxgy_get_discount_value || '?'}% off)`
            : `(₹${form.bxgy_get_discount_value || '?'} off)`
      }`
    : form.discount_type === 'percentage'
      ? `${form.discount_value || '?'}% OFF`
      : `₹${form.discount_value || '?'} OFF`;

  // ── Validation + submit ───────────────────────────────────────────────────
 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Auto-generate a code if auto_apply is on and none entered
  let code = String(form.code ?? '').trim().toUpperCase().replace(/\s/g, '');
  if (!code) {
    if (form.auto_apply) {
      // Generate a deterministic readable code so DB NOT NULL is never violated
      const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
      const prefix = form.deal_type === 'bxgy' ? 'BOGO' : 'AUTO';
      code = `${prefix}-${rand}`;
    } else {
      return toast.error('Promo code is required (or enable Auto Apply)');
    }
  }

  if (form.deal_type === 'bxgy' && form.scope === 'global')
    return toast.error('BXGY offers must be scoped to a merchant, not global');

  if (form.scope !== 'global' && !merchantForPicker)
    return toast.error('Select a merchant / restaurant first');

  if (form.deal_type === 'cart_discount' && num(form.discount_value) <= 0)
    return toast.error('Discount value must be greater than 0');

  if (form.deal_type === 'bxgy') {
    if (picker.buyItems.length === 0)
      return toast.error('Select at least 1 "Buy" item for the BXGY offer');
    if (picker.getItems.length === 0)
      return toast.error('Select at least 1 "Get" item for the BXGY offer');
    if (form.bxgy_get_discount_type !== 'free' && num(form.bxgy_get_discount_value) <= 0)
      return toast.error('Get discount value must be > 0');
  }

  if (
    form.deal_type === 'cart_discount' &&
    form.scope === 'targets' &&
    picker.targets.length === 0
  )
    return toast.error('Add at least 1 menu item target for a targeted promo');

  // Pass the resolved code (never undefined/empty) upstream
  await onSubmit({ ...form, code }, picker.targets, picker.buyItems, picker.getItems, notifyUsers);
};


  const showMerchantSelect = isAdmin && form.scope !== 'global';
  const isBxgy             = form.deal_type === 'bxgy';

  // ── Picker openers ────────────────────────────────────────────────────────
  const openBuyPicker = async () => {
    if (!merchantForPicker) return toast.error('Select a merchant first');
    await picker.open_picker('bxgy_buy', merchantForPicker);
  };

  const openGetPicker = async () => {
    if (!merchantForPicker) return toast.error('Select a merchant first');
    await picker.open_picker('bxgy_get', merchantForPicker);
  };

  const openTargetPicker = async () => {
    if (!merchantForPicker) return toast.error('Select a merchant first');
    await picker.open_picker('targets', merchantForPicker);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[94vh] overflow-y-auto">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">
              {editTarget ? 'Edit Offer' : 'Create Offer'}
            </h2>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Sparkles size={10} />
              Preview: <span className="font-semibold text-primary ml-1">{offerPreview}</span>
            </p>
          </div>
          <button onClick={onClose}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* ── Row 1: Deal type + scope + priority ── */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Deal Type *</label>
              <select
                value={form.deal_type}
                onChange={e => {
                  const next = e.target.value as DealType;
                  update({
                    deal_type: next,
                    // Force merchant scope when switching to BXGY
                    ...(next === 'bxgy' && form.scope === 'global' ? { scope: 'merchant' } : {}),
                  });
                  picker.close_picker();
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white font-semibold"
              >
                <option value="cart_discount">🏷 Cart Discount (code)</option>
                <option value="bxgy">🎁 Buy X Get Y (BXGY / BOGO)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Scope *</label>
              <select
                value={form.scope}
                onChange={e => { update({ scope: e.target.value as PromoScope }); picker.close_picker(); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"
              >
                {isAdmin && !isBxgy && (
                  <option value="global">🌐 Global (all merchants)</option>
                )}
                <option value="merchant">🏪 {isAdmin ? 'Specific Merchant' : 'My Restaurant'}</option>
                {!isBxgy && (
                  <option value="targets">🎯 Specific Menu Items</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Priority</label>
              <input
                type="number" min={0} value={form.priority}
                onChange={e => update({ priority: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-gray-400 mt-0.5">Higher number = applied first</p>
            </div>
          </div>

          {/* ── Merchant selector (admin only, non-global) ── */}
          {showMerchantSelect && (
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">
                Restaurant / Merchant *
              </label>
              <select
                value={form.merchant_id}
                onChange={e => { update({ merchant_id: e.target.value }); picker.close_picker(); }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"
                required
              >
                <option value="">— Select merchant —</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>{m.business_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Code + auto-apply row ── */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">
                Promo Code {form.auto_apply ? '(optional — auto codes need no code)' : '*'}
              </label>
              <input
                value={form.code}
                onChange={e => update({ code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                placeholder={form.auto_apply ? 'AUTO-DEAL (leave blank)' : 'e.g. FLAT30'}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary font-mono tracking-widest uppercase"
              />
            </div>

            <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-50 mt-5 sm:mt-0 self-start">
              <input
                type="checkbox" checked={form.auto_apply}
                onChange={e => update({ auto_apply: e.target.checked })}
                className="w-4 h-4 accent-primary rounded"
              />
              <div>
                <p className="text-sm font-bold text-gray-800">⚡ Auto Apply</p>
                <p className="text-xs text-gray-500">Best eligible offer applied without customer entering code</p>
              </div>
            </label>
          </div>

          {/* ── Description ── */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => update({ description: e.target.value })}
              rows={2}
              placeholder="e.g. Buy 1 large pizza, get 2 small pizzas absolutely free!"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* ── Deal type specific sections ── */}
          {!isBxgy && (
            <CartDiscountSection form={form} update={update} />
          )}

          {isBxgy && (
            <BxgySection
              form={form} update={update}
              buyItems={picker.buyItems} getItems={picker.getItems}
              onPickBuy={openBuyPicker}
              onPickGet={openGetPicker}
              onRemove={(id, side) => picker.remove(id, side)}
            />
          )}

          {/* ── Target item picker (cart_discount + targets scope) ── */}
          {!isBxgy && form.scope === 'targets' && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-teal-700 uppercase">🎯 Target Menu Items</p>
                  <p className="text-xs text-teal-600 mt-0.5">
                    Discount applies only to these items in cart
                  </p>
                </div>
                <button
                  type="button" onClick={openTargetPicker}
                  className="px-3 py-1.5 text-xs font-bold border border-teal-400 text-teal-700 rounded-lg hover:bg-teal-600 hover:text-white transition-all"
                >
                  + Pick Items
                </button>
              </div>

              {picker.targets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {picker.targets.map(it => (
                    <span key={it.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-teal-200 rounded-lg text-xs font-semibold text-gray-800">
                      <span className="truncate max-w-[140px]">{it.name}</span>
                      <span className="text-gray-400">₹{it.price}</span>
                      <button
                        type="button"
                        onClick={() => picker.remove(it.id, 'targets')}
                        className="w-4 h-4 rounded bg-red-100 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {picker.targets.length === 0 && (
                <p className="text-xs text-teal-500 italic">No items selected yet — click Pick Items</p>
              )}
            </div>
          )}

          {/* ── Inline Menu Picker Panel ── */}
          <MenuPickerPanel
            open={picker.open}
            side={picker.side}
            search={picker.search}
            vegOnly={picker.vegOnly}
            sortKey={picker.sortKey}
            visible={picker.visible}
            loading={picker.loading}
            error={picker.error}
            gridItems={picker.gridItems}
            totalFiltered={picker.filtered.length}
            isSelected={picker.isSelected}
            onToggle={picker.toggle}
            onClose={picker.close_picker}
            setSearch={picker.setSearch}
            setVegOnly={picker.setVegOnly}
            setSortKey={picker.setSortKey}
            setVisible={picker.setVisible}
          />

          {/* ── Timing section ── */}
          <TimingSection form={form} update={update} />

          {/* ── Secret promo section ── */}
          <SecretPromoSection form={form} customers={customers} update={update} />

          {/* ── Notify toggle ── */}
          <label className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 cursor-pointer hover:bg-blue-100/60 transition-colors">
            <input
              type="checkbox" checked={notifyUsers}
              onChange={e => setNotifyUsers(e.target.checked)}
              className="w-4 h-4 accent-primary rounded"
            />
            <div>
              <p className="text-sm font-bold text-blue-800">🔔 Push Notification on Publish</p>
              <p className="text-xs text-blue-500">
                {form.is_secret
                  ? 'Notifies assigned users only'
                  : form.scope === 'merchant'
                    ? 'Notifies past customers of this merchant'
                    : 'Notifies up to 50 active customers (global)'}
              </p>
            </div>
          </label>

          {/* ── Submit row ── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Send size={14} />
              {saving
                ? 'Saving…'
                : editTarget ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


