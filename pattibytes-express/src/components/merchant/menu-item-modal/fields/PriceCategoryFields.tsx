'use client';
import { FormState, IC, LC } from '../types';

const DEFAULT_CATEGORIES = ['Starter', 'Main Course', 'Dessert', 'Beverage', 'Snack', 'Combo'];

interface Props {
  form:                Pick<FormState, 'price' | 'category' | 'custom_category'>;
  availableCategories?: string[];
  onChange:            <K extends 'price' | 'category' | 'custom_category'>(k: K, v: FormState[K]) => void;
  onAutosave:          (patch: Partial<FormState>) => void;
}

export function PriceCategoryFields({ form, availableCategories, onChange, onAutosave }: Props) {
  const cats = availableCategories?.length ? availableCategories : DEFAULT_CATEGORIES;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={LC}>Price (₹) *</label>
        <input type="number" min={0} step="0.01" required value={form.price}
          onChange={e => onChange('price', Number(e.target.value))}
          onBlur={() => onAutosave({ price: Number(form.price || 0) })}
          className={IC}
        />
      </div>
      <div>
        <label className={LC}>Category *</label>
        <select required value={form.category} className={IC}
          onChange={e => {
            onChange('category', e.target.value);
            if (e.target.value !== '__custom__') onAutosave({ category: e.target.value });
          }}>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="__custom__">Custom…</option>
        </select>
      </div>
      {form.category === '__custom__' && (
        <div className="sm:col-span-2">
          <label className={LC}>Custom category name</label>
          <input type="text" value={form.custom_category} placeholder="e.g. Tandoor, Rolls"
            onChange={e => onChange('custom_category', e.target.value)}
            onBlur={() => onAutosave({ category: form.custom_category.trim() || 'Main Course' })}
            className={IC}
          />
        </div>
      )}
    </div>
  );
}
