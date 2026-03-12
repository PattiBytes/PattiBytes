import { Search, SortAsc, X } from 'lucide-react';

interface Props {
  search: string; onSearch: (v: string) => void;
  sort: string;   onSort:   (v: string) => void;
}

export function SearchSortBar({ search, onSearch, sort, onSort }: Props) {
  return (
    <div className="flex gap-3 mb-6 flex-wrap sm:flex-nowrap">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" value={search} onChange={e => onSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-10 pr-8 py-2.5 rounded-xl border-2 border-gray-200
                     focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
        />
        {search && (
          <button onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="relative">
        <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <select value={sort} onChange={e => onSort(e.target.value)}
          className="pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200
                     focus:border-primary text-sm font-semibold bg-white appearance-none">
          <option value="default">Sort: Default</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="active_first">Active First</option>
        </select>
      </div>
    </div>
  );
}
