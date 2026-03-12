import { CATEGORIES } from './types';
import type { CustomProduct } from './types';

interface Props {
  products: CustomProduct[];
  active: string;
  onChange: (v: string) => void;
  extraCategories?: { value: string; label: string; emoji: string }[];
}

export function CategoryFilter({ products, active, onChange, extraCategories }: Props) {
  const cats = extraCategories ?? CATEGORIES;   // ← use passed-in list
  return (
    <div className="mb-6 flex gap-2 flex-wrap">
      <FilterChip label="All" count={products.length}
        selected={active === 'all'} onClick={() => onChange('all')} emoji="🗂️" />
      {cats.map(cat => (
        <FilterChip key={cat.value} label={cat.label} emoji={cat.emoji}
          count={products.filter(p => p.category === cat.value).length}
          selected={active === cat.value} onClick={() => onChange(cat.value)} />
      ))}
    </div>
  );
}

function FilterChip({ label, count, selected, onClick, emoji }: {
  label: string; count: number; selected: boolean; onClick: () => void; emoji?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm transition-all duration-200 ${
        selected
          ? 'bg-primary text-white shadow-lg scale-105'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {emoji && <span>{emoji}</span>}
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
        selected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
      }`}>
        {count}
      </span>
    </button>
  );
}
