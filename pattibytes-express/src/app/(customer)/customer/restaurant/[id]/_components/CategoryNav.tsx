'use client';

interface Props {
  categories: string[];
  onSelect: (cat: string) => void;
}

export function CategoryNav({ categories, onSelect }: Props) {
  if (!categories.length) return null;

  return (
    <div className="mb-4 animate-in slide-in-from-bottom duration-500">
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {categories.map((cat, idx) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className="whitespace-nowrap px-4 py-2 rounded-full bg-white border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-primary font-black text-gray-800 transition-all hover:scale-105 animate-in fade-in"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
