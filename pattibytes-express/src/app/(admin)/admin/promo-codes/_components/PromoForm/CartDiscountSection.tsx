'use client';
import type { PromoFormState, DiscountType } from '../../_types';

interface Props {
  form  : PromoFormState;
  update(patch: Partial<PromoFormState>): void;
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

const inp = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white';

export function CartDiscountSection({ form, update }: Props) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
      <p className="text-xs font-bold text-blue-700 uppercase">Cart Discount Configuration</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Discount Type *">
          <select value={form.discount_type}
            onChange={e => update({ discount_type: e.target.value as DiscountType })}
            className={inp}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount (₹)</option>
          </select>
        </Field>

        <Field label={`Discount Value * ${form.discount_type === 'percentage' ? '(%)' : '(₹)'}`}>
          <input type="number" value={form.discount_value}
            onChange={e => update({ discount_value: e.target.value })}
            className={inp} min="0" step="0.01" required/>
        </Field>

        <Field label="Min Order Amount (₹)" hint="Leave empty for no minimum">
          <input type="number" value={form.min_order_amount}
            onChange={e => update({ min_order_amount: e.target.value })}
            className={inp} min="0" step="0.01"/>
        </Field>

        <Field label="Max Discount Cap (₹)" hint="Only applies for percentage type">
          <input type="number" value={form.max_discount_amount}
            onChange={e => update({ max_discount_amount: e.target.value })}
            className={inp} min="0" step="0.01"/>
        </Field>

        <Field label="Global Usage Limit" hint="Total times this code can be used">
          <input type="number" value={form.usage_limit}
            onChange={e => update({ usage_limit: e.target.value })}
            className={inp} min="0"/>
        </Field>

        <Field label="Max Uses Per User" hint="0 or empty = unlimited">
          <input type="number" value={form.max_uses_per_user}
            onChange={e => update({ max_uses_per_user: e.target.value })}
            className={inp} min="0"/>
        </Field>
      </div>
    </div>
  );
}
