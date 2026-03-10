'use client';
import { useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Upload, Edit2, Trash2, ChevronUp, ChevronDown, Clock, Leaf } from 'lucide-react';
import { Row, DishTiming } from './types';

const CATEGORIES = ['Starter', 'Main Course', 'Dessert', 'Beverage', 'Snack', 'Combo', 'Bread ka kamaal'];

interface Props {
  rows:          Row[];
  onSetFile:     (i: number, file: File | null) => void;
  onUpdateRow?:  (i: number, updated: Row) => void;
  onRemoveRow?:  (i: number) => void;
}

export function BulkPreviewList({ rows, onSetFile, onUpdateRow, onRemoveRow }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!rows.length) return null;

  return (
    <div className="border rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900 flex items-center justify-between">
        <span>Preview — {rows.length} row{rows.length !== 1 ? 's' : ''}</span>
        {rows.length > 20 && (
          <span className="text-xs text-gray-400 font-normal">Showing first 20 · edit before saving</span>
        )}
      </div>

      <div className="divide-y">
        {rows.slice(0, 20).map((r, i) => (
          <div key={i} className="p-4">
            {/* Summary line */}
            <div className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="font-semibold text-gray-900 truncate">
                  {r.is_veg
                    ? <span className="text-green-600 mr-1">🟢</span>
                    : <span className="text-red-500 mr-1">🔴</span>
                  }
                  {r.name || '—'}
                  {!r.is_available && (
                    <span className="ml-2 text-xs font-normal text-gray-400">(unavailable)</span>
                  )}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  ₹{Number(r.price || 0).toFixed(2)}
                  {r.discount_percentage > 0 && ` (${r.discount_percentage}% off)`}
                  {' · '}{r.category}
                  {' · '}<Clock size={10} className="inline mr-0.5" />{r.preparation_time} min
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {r.image_url ? `🖼 ${r.image_url}` : '(no image)'}
                </p>
                {r.dish_timing && (
                  <p className="text-xs text-indigo-600 truncate">
                    ⏰ {r.dish_timing.type} · {r.dish_timing.enabled ? 'enabled' : 'disabled'}
                    {r.dish_timing.slots?.length
                      ? ` · ${r.dish_timing.slots[0].from}–${r.dish_timing.slots[0].to}`
                      : ''}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50 text-sm font-semibold">
                  <Upload size={14} /> Image
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => onSetFile(i, e.target.files?.[0] ?? null)} />
                </label>
                {r._file && (
                  <span className="text-xs text-green-600 max-w-[90px] truncate">{r._file.name}</span>
                )}

                {onUpdateRow && (
                  <button type="button" title="Edit row"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-500">
                    {expanded === i ? <ChevronUp size={15} /> : <Edit2 size={15} />}
                  </button>
                )}

                {onRemoveRow && (
                  <button type="button" title="Remove row"
                    onClick={() => onRemoveRow(i)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-400">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Inline editor */}
            {expanded === i && onUpdateRow && (
              <RowEditor
                row={r}
                onSave={updated => { onUpdateRow(i, updated); setExpanded(null); }}
                onCancel={() => setExpanded(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Inline row editor ──────────────────────────────────────────────────── */
function RowEditor({
  row, onSave, onCancel,
}: { row: Row; onSave: (r: Row) => void; onCancel: () => void }) {
  const [d, setD] = useState<Row>({ ...row });
  const [timingText, setTimingText] = useState(
    d.dish_timing ? JSON.stringify(d.dish_timing, null, 2) : '',
  );
  const [timingErr, setTimingErr] = useState('');

  const upd = (patch: Partial<Row>) => setD(prev => ({ ...prev, ...patch }));

  const handleTimingChange = (raw: string) => {
    setTimingText(raw);
    if (!raw.trim()) { setTimingErr(''); upd({ dish_timing: null }); return; }
    try {
      upd({ dish_timing: JSON.parse(raw) as DishTiming });
      setTimingErr('');
    } catch { setTimingErr('Invalid JSON'); }
  };

  const valid = !!d.name.trim() && Number.isFinite(d.price) && d.price >= 0;

  return (
    <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Edit row</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {/* Name */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
          <input value={d.name}
            onChange={e => upd({ name: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
          <input type="number" min={0} step={0.01} value={d.price}
            onChange={e => upd({ price: Number(e.target.value) })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={CATEGORIES.includes(d.category) ? d.category : '__custom'}
            onChange={e => upd({ category: e.target.value === '__custom' ? d.category : e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            {!CATEGORIES.includes(d.category) && (
              <option value="__custom">{d.category} (custom)</option>
            )}
          </select>
        </div>

        {/* Prep time */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <Clock size={11} className="inline mr-1" />Prep time (min)
          </label>
          <input type="number" min={0} value={d.preparation_time}
            onChange={e => upd({ preparation_time: Math.max(0, Number(e.target.value)) })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>

        {/* Discount */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
          <input type="number" min={0} max={100} value={d.discount_percentage}
            onChange={e => upd({ discount_percentage: Math.min(100, Math.max(0, Number(e.target.value))) })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>

        {/* Description */}
        <div className="col-span-2 md:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input value={d.description}
            onChange={e => upd({ description: e.target.value })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>

        {/* Image URL */}
        <div className="col-span-2 md:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
          <input value={d.image_url}
            onChange={e => upd({ image_url: e.target.value })}
            placeholder="https://... or leave blank"
            className="w-full px-3 py-1.5 border rounded-lg text-sm" />
        </div>

        {/* Category ID */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Category ID (UUID or blank)</label>
          <input value={d.category_id ?? ''}
            onChange={e => upd({ category_id: e.target.value.trim() || null })}
            className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono" />
        </div>

        {/* Checkboxes */}
        <div className="flex items-end gap-4 pb-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={d.is_veg}
              onChange={e => upd({ is_veg: e.target.checked })} className="w-4 h-4" />
            <Leaf size={13} className="text-green-600" /> Veg
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={d.is_available}
              onChange={e => upd({ is_available: e.target.checked })} className="w-4 h-4" />
            Available
          </label>
        </div>

        {/* dish_timing */}
        <div className="col-span-2 md:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            dish_timing (JSON — leave blank for always available)
          </label>
          <textarea
            value={timingText}
            onChange={e => handleTimingChange(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={`{"type":"scheduled","enabled":true,"slots":[{"from":"09:00","to":"22:00","days":[0,1,2,3,4,5,6]}]}`}
            className={`w-full px-3 py-1.5 border rounded-lg text-xs font-mono resize-y ${timingErr ? 'border-red-400' : ''}`}
          />
          {timingErr && <p className="text-xs text-red-500 mt-0.5">{timingErr}</p>}
        </div>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-1">
        <button type="button" disabled={!valid || !!timingErr}
          onClick={() => onSave(d)}
          className="px-5 py-2 bg-primary text-white rounded-xl font-semibold text-sm disabled:opacity-50">
          Save row
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 border rounded-xl font-semibold text-sm hover:bg-white">
          Cancel
        </button>
      </div>
    </div>
  );
}
