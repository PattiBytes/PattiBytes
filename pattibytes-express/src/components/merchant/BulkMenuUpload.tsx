/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useMemo, useState } from 'react';
import { X, Upload, FileText, FileJson, Sheet, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
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
  _file?: File | null;
};

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function templateSample() {
  return [
    {
      name: 'Pizza',
      description: 'Very nice chopping',
      price: 98,
      category: 'Main Course',
      image_url: 'https://res.cloudinary.com/...png',
      is_available: true,
      is_veg: true,
      preparation_time: 30,
      discount_percentage: 0,
      category_id: '',
    },
  ];
}

function downloadCsvTemplate() {
  const csv = Papa.unparse(templateSample()); // CSV export [web:202]
  downloadBlob('menu_template.csv', new Blob([csv], { type: 'text/csv;charset=utf-8' })); // download attr [web:200]
}

function downloadJsonTemplate() {
  downloadBlob(
    'menu_template.json',
    new Blob([JSON.stringify(templateSample(), null, 2)], { type: 'application/json' })
  );
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.json_to_sheet(templateSample());
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'menu');
  XLSX.writeFile(wb, 'menu_template.xlsx'); // SheetJS export [web:186]
}

function parseBool(v: any, fallback: boolean) {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
}

function parseNum(v: any, fallback: number) {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRow(obj: any, i: number): { row?: Row; err?: string } {
  const name = String(obj?.name ?? '').trim();
  const price = parseNum(obj?.price, NaN);

  if (!name) return { err: `Row ${i + 1}: name is required` };
  if (!Number.isFinite(price)) return { err: `Row ${i + 1}: price is invalid` };

  return {
    row: {
      name,
      description: String(obj?.description ?? '').trim(),
      price,
      category: String(obj?.category ?? 'Main Course').trim() || 'Main Course',
      image_url: String(obj?.image_url ?? '').trim(),
      is_available: parseBool(obj?.is_available, true),
      is_veg: parseBool(obj?.is_veg, true),
      preparation_time: parseNum(obj?.preparation_time, 30),
      discount_percentage: parseNum(obj?.discount_percentage, 0),
      category_id: (String(obj?.category_id ?? '').trim() || '') || null,
      _file: null,
    },
  };
}

function firstSheetToObjects(workbook: XLSX.WorkBook): any[] {
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];
  const ws = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
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
  const [rawText, setRawText] = useState(
    `name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage,category_id\n`
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewCount = useMemo(() => rows.length, [rows]);

  const setRowFile = (i: number, file: File | null) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, _file: file } : r)));
  };

  const parseObjects = (objs: any[]) => {
    const errs: string[] = [];
    const out: Row[] = [];

    objs.forEach((o, i) => {
      const { row, err } = normalizeRow(o, i);
      if (err) errs.push(err);
      if (row) out.push(row);
    });

    setRows(out);
    if (errs.length) toast.error(errs.slice(0, 3).join(' | '));
    if (out.length) toast.success(`Parsed ${out.length} row(s)`);
    if (!out.length && !errs.length) toast.error('No rows found');
  };

  const parseFromCsvText = () => {
    setParsing(true);
    try {
      const res = Papa.parse(rawText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => String(h || '').trim().toLowerCase(),
      });

      if (res.errors?.length) {
        toast.error(res.errors.slice(0, 2).map((e) => e.message).join(' | '));
      }

      parseObjects((res.data as any[]) || []);
    } finally {
      setParsing(false);
    }
  };

  const handleFile = async (file: File) => {
    setRows([]);
    const name = file.name.toLowerCase();

    try {
      setParsing(true);

      if (name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => String(h || '').trim().toLowerCase(),
          complete: (results) => {
            setParsing(false);
            parseObjects((results.data as any[]) || []);
          },
          error: () => {
            setParsing(false);
            toast.error('CSV parse failed');
          },
        });
        return;
      }

      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        parseObjects(firstSheetToObjects(wb));
        return;
      }

      if (name.endsWith('.json')) {
        const txt = await file.text();
        const parsed = JSON.parse(txt);
        const objs = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : [];
        parseObjects(objs);
        return;
      }

      toast.error('Unsupported file. Upload CSV / XLSX / XLS / JSON');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to read file');
    } finally {
      setParsing(false);
    }
  };

  const saveAll = async () => {
    if (!rows.length) return toast.error('Parse data first');
    setSaving(true);

    try {
      const fixed: Row[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        let imageUrl = r.image_url;

        if (!imageUrl && r._file) {
          imageUrl = await uploadToCloudinary(r._file, 'menu-items');
        }

        fixed.push({ ...r, image_url: imageUrl || '' });
      }

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
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Bulk upload failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload Menu Items</h2>
            <p className="text-xs text-gray-600 mt-1">
              Upload CSV / Excel / JSON, or paste CSV text. Images: use image_url or upload per-row.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50">
            <X size={22} />
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
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50">
              <Sheet size={16} />
              <span className="font-semibold text-sm">Upload Excel</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>

            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50">
              <FileJson size={16} />
              <span className="font-semibold text-sm">Upload JSON</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>

            <button
              type="button"
              onClick={parseFromCsvText}
              disabled={parsing}
              className="px-4 py-2 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
            >
              {parsing ? 'Parsing…' : 'Parse pasted CSV'}
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadCsvTemplate}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50 flex items-center gap-2"
              >
                <Download size={16} />
                CSV template
              </button>
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50 flex items-center gap-2"
              >
                <Download size={16} />
                Excel template
              </button>
              <button
                type="button"
                onClick={downloadJsonTemplate}
                className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50 flex items-center gap-2"
              >
                <Download size={16} />
                JSON template
              </button>
            </div>

            <button
              type="button"
              onClick={saveAll}
              disabled={saving || !rows.length}
              className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Save (${previewCount})`}
            </button>

            <button
              type="button"
              onClick={() => {
                setRows([]);
                toast.info('Cleared preview');
              }}
              className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 inline-block mr-2" />
              Clear
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Paste CSV content (optional)</label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-2">
              Required headers: <span className="font-mono">name, price</span>. Others optional.
            </p>
          </div>

          {rows.length > 0 && (
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
                        image_url: {r.image_url ? r.image_url : '(empty)'}
                      </p>
                    </div>

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
            Example CSV row:
            <div className="mt-1 font-mono break-words">
              Pizza,Very nice chopping,98,Main Course,https://res.cloudinary.com/...png,true,true,30,0,
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
