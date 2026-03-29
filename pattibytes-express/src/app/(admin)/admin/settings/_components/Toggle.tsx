'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

export function Toggle({ checked, onChange, disabled, size = 'md', label }: ToggleProps) {
  const track = size === 'sm' ? 'w-8 h-4' : 'w-11 h-6';
  const thumb = size === 'sm' ? 'w-3 h-3 top-0.5' : 'w-5 h-5 top-0.5';
  const translate = size === 'sm' ? (checked ? 'translate-x-4' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5');
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex ${track} rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
          ${checked ? 'bg-primary' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute ${thumb} rounded-full bg-white shadow-md transform transition-transform duration-300 ${translate}`}
        />
      </button>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
    </label>
  );
}