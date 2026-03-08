'use client';
import { Upload } from 'lucide-react';
import { Row } from './types';

interface Props { rows: Row[]; onSetFile: (i: number, file: File | null) => void; }

export function BulkPreviewList({ rows, onSetFile }: Props) {
  if (!rows.length) return null;
  return (
    <div className="border rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900">
        Preview (first 20 rows)
      </div>
      <div className="divide-y">
        {rows.slice(0, 20).map((r, i) => (
          <div key={i} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{r.name || '—'}</p>
              <p className="text-xs text-gray-600 truncate">
                ₹{Number(r.price || 0).toFixed(2)} • {r.category} • veg:{String(r.is_veg)} • avail:{String(r.is_available)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                image_url: {r.image_url || '(empty)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50">
                <Upload size={16} />
                <span className="text-sm font-semibold">Row Image</span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => onSetFile(i, e.target.files?.[0] ?? null)} />
              </label>
              <span className="text-xs text-gray-600">{r._file ? r._file.name : 'No file'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
