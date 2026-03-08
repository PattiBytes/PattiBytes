'use client';
import { FormState } from '../types';

interface Props {
  form:       Pick<FormState, 'is_veg' | 'is_available'>;
  onChange:   <K extends 'is_veg' | 'is_available'>(k: K, v: boolean) => void;
  onAutosave: (patch: Partial<FormState>) => void;
}

const TOGGLES = [
  { key: 'is_veg'       as const, label: 'Vegetarian', sub: 'Shown as Veg' },
  { key: 'is_available' as const, label: 'Available',  sub: 'Visible to customers' },
] as const;

export function ToggleFields({ form, onChange, onAutosave }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TOGGLES.map(({ key, label, sub }) => (
        <label key={key} className="flex items-center gap-3 rounded-xl border px-4 py-3 hover:bg-gray-50 cursor-pointer transition">
          <input type="checkbox" checked={Boolean(form[key])}
            onChange={e => { onChange(key, e.target.checked); onAutosave({ [key]: e.target.checked }); }}
            className="w-5 h-5 text-primary rounded focus:ring-primary"
          />
          <span className="font-semibold text-gray-800 text-sm">{label}</span>
          <span className="text-xs text-gray-400 ml-auto">{sub}</span>
        </label>
      ))}
    </div>
  );
}
