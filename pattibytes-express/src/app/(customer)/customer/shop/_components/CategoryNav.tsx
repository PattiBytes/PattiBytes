'use client';

interface Props {
  categories: { id: string; label: string; emoji: string; accent: string; count: number }[];
  selected: string;
  loading: boolean;
  onSelect: (id: string) => void;
}

function Skeleton() {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i}
          className="flex-shrink-0 w-20 h-9 rounded-full bg-gray-200 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function CategoryNav({ categories, selected, loading, onSelect }: Props) {
  if (loading) return <Skeleton />;

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {categories.map((cat, i) => {
        const active = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full
                        border-2 text-xs font-black transition-all duration-200
                        hover:scale-105 active:scale-95
                        animate-in fade-in duration-300
                        ${active
                          ? `${cat.accent} border-transparent shadow-md scale-105`
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                        }`}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span className="text-sm leading-none">{cat.emoji}</span>
            {cat.label}
            {cat.count > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none
                                ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {cat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

