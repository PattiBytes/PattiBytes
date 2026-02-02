/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { toast } from 'react-toastify';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { menuService } from '@/services/menu';

type Row = {
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  is_available: boolean;
  is_veg: boolean;
  preparation_time: number;
  discount_percentage: number;
  category_id: string | null;
  _file?: File | null; // optional per-row image file
};

function parseBool(v: string, fallback: boolean) {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
}

function parseNum(v: string, fallback: number) {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function splitCsvLine(line: string) {
  // Minimal CSV parser (supports quoted fields with commas)
  const out: string[] = [];
  let cur = '';
  let inQ = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function parseCsv(text: string): { rows: Row[]; errors: string[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { rows: [], errors: ['CSV is empty'] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idx = (key: string) => header.indexOf(key);

  if (idx('name') === -1 || idx('price') === -1) {
    return { rows: [], errors: ['CSV must include headers: name, price (recommended: category, image_url, is_available, is_veg, preparation_time, discount_percentage)'] };
  }

  const errors: string[] = [];
  const rows: Row[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const get = (k: string) => (idx(k) >= 0 ? (cols[idx(k)] ?? '') : '');

    const name = get('name');
    const price = parseNum(get('price'), NaN);

    if (!name.trim()) errors.push(`Line ${i + 1}: name is required`);
    if (!Number.isFinite(price)) errors.push(`Line ${i + 1}: price is invalid`);

    rows.push({
      name: name.trim(),
      description: get('description')?.trim() || '',
      price: Number.isFinite(price) ? price : 0,
      category: get('category')?.trim() || 'Main Course',
      image_url: get('image_url')?.trim() || '',
      is_available: parseBool(get('is_available'), true),
      is_veg: parseBool(get('is_veg'), true),
      preparation_time: parseNum(get('preparation_time'), 30),
      discount_percentage: parseNum(get('discount_percentage'), 0),
      category_id: (get('category_id')?.trim() || '') || null,
      _file: null,
    });
  }

  return { rows, errors };
}

export default function BulkMenuUploadModal({
  merchantId,
  onClose,
  onSuccess,
}: {
  merchantId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [csvText, setCsvText] = useState(
    `name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage,category_id\n`
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewCount = useMemo(() => rows.length, [rows]);

  const loadCsvFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
  };

  const handleParse = () => {
    setParsing(true);
    try {
      const { rows, errors } = parseCsv(csvText);
      if (errors.length) {
        toast.error(errors.slice(0, 3).join(' | '));
      }
      setRows(rows);
      if (rows.length) toast.success(`Parsed ${rows.length} row(s)`);
    } finally {
      setParsing(false);
    }
  };

  const setRowFile = (i: number, file: File | null) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, _file: file } : r)));
  };

  const saveAll = async () => {
    if (!rows.length) return toast.error('Parse CSV first');

    setSaving(true);
    try {
      // Upload images for rows that have a file and no image_url
      const fixed: Row[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        if (!r.name.trim()) {
          toast.error(`Row ${i + 1}: name is required`);
          setSaving(false);
          return;
        }

        let imageUrl = r.image_url;
        if (!imageUrl && r._file) {
          imageUrl = await uploadToCloudinary(r._file, 'menu-items');
        }

        fixed.push({ ...r, image_url: imageUrl || '' });
      }

      // Insert in one go (your service should do supabase insert)
      await menuService.createMenuItemsBulk(
        fixed.map((r) => ({
          merchant_id: merchantId,
          name: r.name,
          description: r.description,
          price: r.price,
          category: r.category,
          image_url: r.image_url,
          is_available: r.is_available,
          is_veg: r.is_veg,
          preparation_time: r.preparation_time,
          discount_percentage: r.discount_percentage,
          category_id: r.category_id,
        }))
      );

      toast.success(`Uploaded ${fixed.length} item(s)`);
      onSuccess();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Bulk upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload Menu Items</h2>
            <p className="text-xs text-gray-600 mt-1">CSV supports image_url (link) or per-row image upload.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50">
              <FileText size={16} />
              <span className="font-semibold text-sm">Upload CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadCsvFile(f);
                }}
              />
            </label>

            <button
              onClick={handleParse}
              disabled={parsing}
              className="px-4 py-2 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
            >
              {parsing ? 'Parsing…' : 'Parse CSV'}
            </button>

            <button
              onClick={saveAll}
              disabled={saving || !rows.length}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Save (${previewCount})`}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CSV content</label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-xs"
            />
          </div>

          {rows.length > 0 && (
            <div className="border rounded-2xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 text-sm font-bold text-gray-900">Preview (first 20 rows)</div>
              <div className="divide-y">
                {rows.slice(0, 20).map((r, i) => (
                  <div key={i} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{r.name || '—'}</p>
                      <p className="text-xs text-gray-600 truncate">
                        ₹{Number(r.price || 0).toFixed(2)} • {r.category} • veg:{String(r.is_veg)} • avail:{String(r.is_available)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        image_url: {r.image_url ? r.image_url : '(empty)'}
                      </p>
                    </div>

                    {/* Optional file picker per row (only needed if image_url is empty) */}
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50">
                        <Upload size={16} />
                        <span className="text-sm font-semibold">Row Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setRowFile(i, e.target.files?.[0] ?? null)}
                        />
                      </label>
                      <span className="text-xs text-gray-600">{r._file ? r._file.name : 'No file'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-600">
            Example row (matches your DB): <br />
            <span className="font-mono">
              Pizza,Very nice chopping,98.00,Main Course,https://res.cloudinary.com/...png,true,true,30,0,
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
