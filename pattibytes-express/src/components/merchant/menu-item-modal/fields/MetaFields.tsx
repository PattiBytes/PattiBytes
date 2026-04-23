'use client';
import { FormState, IC, LC } from '../types';

interface Props {
  form:        Pick<FormState, 'preparation_time' | 'discount_percentage' | 'category_id'>;
  discountOk:  boolean;
  onChange:    <K extends 'preparation_time' | 'discount_percentage' | 'category_id'>(k: K, v: FormState[K]) => void;
  onAutosave:  (patch: Partial<FormState>) => void;
}

export function MetaFields({ form, discountOk, onChange, onAutosave }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className={LC}>Prep time (min)</label>
        <input type="number" min={0} value={form.preparation_time}
          onChange={e => onChange('preparation_time', Number(e.target.value))}
          onBlur={() => onAutosave({ preparation_time: Number(form.preparation_time || 0) })}
          className={IC}
        />
      </div>
      <div>
        <label className={LC}>Discount (%)</label>
        <input type="number" min={0} max={100} value={form.discount_percentage}
          onChange={e => onChange('discount_percentage', Number(e.target.value))}
          onBlur={() => { if (discountOk) onAutosave({ discount_percentage: Number(form.discount_percentage || 0) }); }}
          className={`${IC} ${discountOk ? '' : '!border-red-400 bg-red-50'}`}
        />
        {!discountOk && <p className="text-xs text-red-600 mt-1">Must be 0–100</p>}
      </div>
      <div>
        <label className={LC}>Category ID</label>
        <input type="text" value={form.category_id || ''} placeholder="UUID or blank"
          onChange={e => onChange('category_id', e.target.value || null)}
          onBlur={() => onAutosave({ category_id: form.category_id || null })}
          className={IC}
        />
      </div>
    </div>
  );
}

