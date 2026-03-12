/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRef, useState } from 'react';
import {
  X, Upload, Download, AlertCircle, CheckCircle2,
  Loader2, ClipboardPaste, FileText, Trash2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '@/lib/supabase';
import { CATEGORIES } from './types';

// ── CSV helpers ──────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const res: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (line[i] === ',' && !inQ) { res.push(cur.trim()); cur = ''; }
    else cur += line[i];
  }
  res.push(cur.trim());
  return res;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

// ── Types ────────────────────────────────────────────────────────────────────
type ParsedRow = {
  _row: number;
  _valid: boolean;
  _errors: string[];
  name: string;
  category: string;
  price: number;
  unit: string;
  description: string;
  imageurl: string;
  available_from: string;
  available_to: string;
  available_days: number[] | null;
  stock_qty: number | null;
  sort_order: number | null;
};

function toRow(raw: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  const name = (raw.name || '').trim();
  if (!name) errors.push('Name required');
  const price = parseFloat(raw.price || '');
  if (!price || price <= 0) errors.push('Invalid price');
  const unit = (raw.unit || 'pc').trim();
  if (!unit) errors.push('Unit required');
  const category = (raw.category || 'custom').trim();

  // available_days: "0,1,2,3,4,5,6" or JSON array
  let available_days: number[] | null = null;
  if (raw.available_days) {
    try {
      const arr = raw.available_days.replace(/[\[\]"']/g, '').split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      if (arr.length > 0 && arr.length < 7) available_days = arr;
    } catch { /* ignore */ }
  }

  return {
    _row: rowNum,
    _valid: errors.length === 0,
    _errors: errors,
    name,
    category,
    price: isNaN(price) ? 0 : price,
    unit,
    description: (raw.description || '').trim(),
    imageurl: (raw.imageurl || raw.image_url || '').trim(),
    available_from: (raw.available_from || '').trim(),
    available_to: (raw.available_to || '').trim(),
    available_days,
    stock_qty: raw.stock_qty ? parseInt(raw.stock_qty) || null : null,
    sort_order: raw.sort_order ? parseInt(raw.sort_order) || null : null,
  };
}

// ── Template ─────────────────────────────────────────────────────────────────
function downloadTemplate(format: 'csv' | 'json') {
  const sample = [
    { name: 'Fresh Milk', category: 'dairy', price: 50, unit: '500ml', description: 'Fresh full cream milk', imageurl: '', available_from: '07:00', available_to: '20:00', available_days: '0,1,2,3,4,5,6', stock_qty: 100, sort_order: 1 },
    { name: 'Paneer 200g', category: 'dairy', price: 80, unit: '200g', description: '', imageurl: '', available_from: '', available_to: '', available_days: '', stock_qty: '', sort_order: 2 },
    { name: 'Dolo 650', category: 'medicines', price: 30, unit: 'strip', description: 'Paracetamol 650mg', imageurl: '', available_from: '', available_to: '', available_days: '', stock_qty: 50, sort_order: 1 },
  ];

  let content: string, mime: string, ext: string;
  if (format === 'csv') {
    const headers = 'name,category,price,unit,description,imageurl,available_from,available_to,available_days,stock_qty,sort_order';
    const rows = sample.map(r =>
      [r.name, r.category, r.price, r.unit, r.description, r.imageurl, r.available_from, r.available_to, r.available_days, r.stock_qty, r.sort_order]
        .map(v => (String(v).includes(',') ? `"${v}"` : v)).join(',')
    );
    content = [headers, ...rows].join('\n');
    mime = 'text/csv'; ext = 'csv';
  } else {
    content = JSON.stringify(sample.map(r => ({ ...r, price: r.price, stock_qty: r.stock_qty || null, sort_order: r.sort_order || null })), null, 2);
    mime = 'application/json'; ext = 'json';
  }

  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `products-template.${ext}`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  onClose: () => void;
  onImported: () => void;
  existingCategories: string[];
}

export function BulkUploadModal({ onClose, onImported, existingCategories }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null);
  const [paste,    setPaste]    = useState('');
  const [rows,     setRows]     = useState<ParsedRow[]>([]);
  const [parsed,   setParsed]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [tab, setTab] = useState<'paste' | 'file'>('paste');

  const allCategories = [
    ...CATEGORIES.map(c => c.value),
    ...existingCategories.filter(c => !CATEGORIES.find(x => x.value === c)),
  ];

  const parse = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { toast.error('Nothing to parse'); return; }
    let raw: Record<string, string>[] = [];
    try {
      // Try JSON first
      if (trimmed.startsWith('[')) {
        const arr = JSON.parse(trimmed);
        raw = arr.map((item: any) =>
          Object.fromEntries(Object.entries(item).map(([k, v]) => [k.toLowerCase(), String(v ?? '')]))
        );
      } else {
        raw = parseCSV(trimmed);
      }
    } catch (e: any) {
      toast.error('Could not parse — check format: ' + e?.message);
      return;
    }
    if (!raw.length) { toast.error('No data rows found'); return; }
    setRows(raw.map((r, i) => toRow(r, i + 1)));
    setParsed(true);
    toast.success(`Parsed ${raw.length} rows`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'json', 'txt'].includes(ext ?? '')) {
      toast.error('Supported: .csv, .json, .txt');
      return;
    }
    const text = await file.text();
    setTab('paste');
    setPaste(text);
    parse(text);
  };

  const handleDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setPaste(text);
      parse(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r._valid);
    if (!valid.length) { toast.error('No valid rows to import'); return; }
    setImporting(true);
    try {
      const now = new Date().toISOString();
      const inserts = valid.map(r => ({
        name:           r.name,
        category:       r.category,
        price:          r.price,
        unit:           r.unit,
        description:    r.description || null,
        imageurl:       r.imageurl || null,
        available_from: r.available_from || null,
        available_to:   r.available_to   || null,
        available_days: r.available_days,
        stock_qty:      r.stock_qty,
        sort_order:     r.sort_order,
        isactive:       true,
        createdat:      now,
        updatedat:      now,
      }));

      // Batch in chunks of 50
      for (let i = 0; i < inserts.length; i += 50) {
        const { error } = await supabase.from('customproducts').insert(inserts.slice(i, i + 50));
        if (error) throw error;
      }

      toast.success(`✅ Imported ${valid.length} products!`);
      onImported();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount   = rows.filter(r => r._valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4
                    animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-4xl rounded-t-3xl sm:rounded-2xl shadow-2xl
                      max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div>
            <h2 className="text-lg font-black text-gray-900">📦 Bulk Upload Products</h2>
            <p className="text-xs text-gray-500">CSV · JSON · Paste · Drag &amp; Drop</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template downloads */}
          <div className="flex gap-3 flex-wrap">
            <span className="text-sm font-bold text-gray-600 self-center">Download template:</span>
            <button onClick={() => downloadTemplate('csv')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700
                         rounded-xl font-bold text-sm hover:bg-green-100 transition-all border border-green-200">
              <Download className="w-4 h-4" /> CSV Template
            </button>
            <button onClick={() => downloadTemplate('json')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700
                         rounded-xl font-bold text-sm hover:bg-blue-100 transition-all border border-blue-200">
              <Download className="w-4 h-4" /> JSON Template
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            {(['paste', 'file'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 font-bold text-sm border-b-2 transition-all -mb-px capitalize ${
                  tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'paste' ? '📋 Paste Text' : '📁 File Upload'}
              </button>
            ))}
          </div>

          {tab === 'paste' ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Paste CSV or JSON
              </label>
              <textarea
                value={paste}
                onChange={e => { setPaste(e.target.value); setParsed(false); setRows([]); }}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary
                           focus:ring-2 focus:ring-primary/20 text-sm font-mono resize-y"
                placeholder={'name,category,price,unit,description\nFresh Milk,dairy,50,500ml,Full cream milk\n\n— or paste JSON array —\n[{"name":"Fresh Milk","category":"dairy","price":50,"unit":"500ml"}]'}
              />
              <button onClick={() => parse(paste)}
                disabled={!paste.trim()}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white
                           rounded-xl font-bold text-sm hover:shadow-md transition-all disabled:opacity-50">
                <ClipboardPaste className="w-4 h-4" /> Parse
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDropZone}
              className="border-3 border-dashed border-gray-300 rounded-2xl p-10 text-center
                         hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="font-bold text-gray-700">Drop file here or click to browse</p>
              <p className="text-sm text-gray-500 mt-1">Supports .csv, .json, .txt</p>
              <input ref={fileRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* Preview */}
          {parsed && rows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-700">
                    Preview — {rows.length} rows
                  </span>
                  {validCount > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                      ✓ {validCount} valid
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                      ✗ {invalidCount} invalid (will skip)
                    </span>
                  )}
                </div>
                <button onClick={() => { setRows([]); setParsed(false); setPaste(''); }}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">#</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Name</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Category</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Price</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Unit</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Timing</th>
                      <th className="px-3 py-2 text-left font-bold text-gray-600">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map(r => (
                      <tr key={r._row}
                        className={r._valid ? 'bg-white hover:bg-green-50' : 'bg-red-50'}>
                        <td className="px-3 py-2 text-gray-400">{r._row}</td>
                        <td className="px-3 py-2">
                          {r._valid
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : (
                              <div className="flex items-center gap-1 text-red-600" title={r._errors.join(', ')}>
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">{r._errors[0]}</span>
                              </div>
                            )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-900 max-w-[120px] truncate">{r.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            allCategories.includes(r.category)
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {r.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-primary">₹{r.price}</td>
                        <td className="px-3 py-2 text-gray-600">{r.unit}</td>
                        <td className="px-3 py-2 text-gray-500">
                          {r.available_from ? `${r.available_from}–${r.available_to}` : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-500">{r.stock_qty ?? '∞'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import button */}
              <div className="flex gap-3 mt-4">
                <button onClick={onClose}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="flex-1 bg-gradient-to-r from-primary to-pink-600 text-white py-3 rounded-xl
                             font-bold hover:shadow-lg transition-all disabled:opacity-50
                             flex items-center justify-center gap-2">
                  {importing
                    ? <><Loader2 className="w-5 h-5 animate-spin" />Importing…</>
                    : <><FileText className="w-5 h-5" />Import {validCount} Product{validCount !== 1 ? 's' : ''}</>}
                </button>
              </div>
            </div>
          )}

          {/* Field reference */}
          {!parsed && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-600 mb-2">Available columns:</p>
              <div className="flex flex-wrap gap-2">
                {['name *', 'category *', 'price *', 'unit *', 'description', 'imageurl',
                  'available_from', 'available_to', 'available_days', 'stock_qty', 'sort_order']
                  .map(col => (
                    <code key={col}
                      className={`text-xs px-2 py-1 rounded font-mono ${
                        col.includes('*') ? 'bg-primary/10 text-primary font-bold' : 'bg-gray-200 text-gray-700'}`}>
                      {col}
                    </code>
                  ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Required. <code>available_days</code>: comma-separated 0–6 (0=Sun). 
                <code> category</code>: custom values are accepted and will appear in filters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
