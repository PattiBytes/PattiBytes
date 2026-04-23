'use client';
import { FormState, IC, LC } from '../types';

interface Props {
  form:       Pick<FormState, 'name' | 'description'>;
  onChange:   <K extends 'name' | 'description'>(k: K, v: string) => void;
  onAutosave: (patch: Partial<FormState>) => void;
}

export function BasicInfoFields({ form, onChange, onAutosave }: Props) {
  return (
    <>
      <div>
        <label className={LC}>Item Name *</label>
        <input type="text" required value={form.name} placeholder="e.g. Butter Chicken"
          onChange={e => onChange('name', e.target.value)}
          onBlur={() => { const v = form.name.trim(); if (v) onAutosave({ name: v }); }}
          className={IC}
        />
      </div>
      <div>
        <label className={LC}>Description</label>
        <textarea rows={3} value={form.description} placeholder="Short description shown to customers"
          onChange={e => onChange('description', e.target.value)}
          onBlur={() => onAutosave({ description: form.description.trim() })}
          className={IC}
        />
      </div>
    </>
  );
}

