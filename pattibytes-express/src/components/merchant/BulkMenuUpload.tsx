/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { menuService }          from '@/services/menu';

import { Row }               from './bulk-menu-upload/types';
import { firstSheetToObjects, normalizeRow } from './bulk-menu-upload/helpers';
import { UploadButtons }     from './bulk-menu-upload/UploadButtons';
import { TemplateButtons }   from './bulk-menu-upload/TemplateButtons';
import { CsvTextArea }       from './bulk-menu-upload/CsvTextArea';
import { BulkPreviewList }   from './bulk-menu-upload/BulkPreviewList';
import { ActionBar }         from './bulk-menu-upload/ActionBar';

interface Props { merchantId: string; onClose: () => void; onSuccess: () => void; }

// ── pre-filled CSV with every field and one sample row ──────────────────────
const DEFAULT_CSV =
  `name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage,category_id,dish_timing\n` +
  `Sample Burger,Juicy grilled burger,149,Main Course,,true,true,30,0,,\n`;

export default function BulkMenuUploadModal({ merchantId, onClose, onSuccess }: Props) {
  const [rawText,   setRawText]   = useState(DEFAULT_CSV);
  const [rows,      setRows]      = useState<Row[]>([]);
  const [parsing,   setParsing]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [progress,  setProgress]  = useState<string>('');

  const previewCount = useMemo(() => rows.length, [rows]);

  // ── row helpers ────────────────────────────────────────────────────────────
  const setRowFile   = (i: number, file: File | null) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, _file: file } : r));

  const updateRow    = (i: number, updated: Row) =>
    setRows(prev => prev.map((r, idx) => idx === i ? updated : r));

  const removeRow    = (i: number) =>
    setRows(prev => prev.filter((_, idx) => idx !== i));

  // ── parsing ────────────────────────────────────────────────────────────────
  const parseObjects = (objs: any[]) => {
    const errs: string[] = [];
    const out: Row[]     = [];
    objs.forEach((o, i) => {
      const { row, err } = normalizeRow(o, i);
      if (err) errs.push(err);
      if (row) out.push(row);
    });
    setRows(out);
    if (errs.length)              toast.error(errs.slice(0, 3).join(' | '));
    if (out.length)               toast.success(`Parsed ${out.length} row(s)`);
    if (!out.length && !errs.length) toast.error('No rows found — check headers');
  };

  const parseFromCsvText = () => {
    setParsing(true);
    try {
      const res = Papa.parse(rawText, {
        header: true, skipEmptyLines: true,
        transformHeader: h => String(h ?? '').trim().toLowerCase(),
      });
      if (res.errors?.length)
        toast.warning(res.errors.slice(0, 2).map(e => e.message).join(' | '));
      parseObjects((res.data as any[]) ?? []);
    } finally { setParsing(false); }
  };

  const handleFile = async (file: File) => {
    setRows([]);
    const name = file.name.toLowerCase();
    try {
      setParsing(true);
      if (name.endsWith('.csv')) {
        Papa.parse(file, {
          header: true, skipEmptyLines: true,
          transformHeader: h => String(h ?? '').trim().toLowerCase(),
          complete: r => { setParsing(false); parseObjects((r.data as any[]) ?? []); },
          error:   () => { setParsing(false); toast.error('CSV parse failed'); },
        });
        return;
      }
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        parseObjects(firstSheetToObjects(XLSX.read(await file.arrayBuffer())));
        return;
      }
      if (name.endsWith('.json')) {
        const parsed = JSON.parse(await file.text());
        parseObjects(Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : []);
        return;
      }
      toast.error('Unsupported file. Upload CSV / XLSX / XLS / JSON');
    } catch (e: any) { toast.error(e?.message || 'Failed to read file'); }
    finally         { setParsing(false); }
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const saveAll = async () => {
    if (!rows.length) return toast.error('Parse data first');
    setSaving(true);
    setProgress('');
    try {
      const fixed: Row[] = [];
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        setProgress(`Preparing ${i + 1}/${rows.length}…`);
        let imageUrl = r.image_url;
        if (!imageUrl && r._file) {
          imageUrl = await uploadToCloudinary(r._file, 'menu-items');
        }
        fixed.push({ ...r, image_url: imageUrl ?? '' });
      }
      setProgress('Saving to database…');
      await menuService.createMenuItemsBulk(
        fixed.map(r => ({
          merchant_id        : merchantId,
          name               : r.name,
          description        : r.description,
          price              : r.price,
          category           : r.category,
          image_url          : r.image_url || undefined,
          is_available       : r.is_available,
          is_veg             : r.is_veg,
          preparation_time   : r.preparation_time,
          discount_percentage: r.discount_percentage,
          category_id        : r.category_id,
          dish_timing        : r.dish_timing ?? null,
        })),
      );
      toast.success(`✅ Uploaded ${fixed.length} item(s)`);
      onSuccess();
      onClose();
    } catch (e: any) { toast.error(e?.message || 'Bulk upload failed'); }
    finally          { setSaving(false); setProgress(''); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload Menu Items</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload CSV / Excel / JSON, or paste CSV text below.
              Supports all fields including <span className="font-mono">dish_timing</span> (JSON).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50">
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <UploadButtons onFile={handleFile} />
          <TemplateButtons />
          <ActionBar
            parsing={parsing} saving={saving} previewCount={previewCount}
            progress={progress}
            onParseCsv={parseFromCsvText}
            onSaveAll={saveAll}
            onClear={() => { setRows([]); setRawText(DEFAULT_CSV); toast.info('Cleared'); }}
          />
          <CsvTextArea value={rawText} onChange={setRawText} />
          <BulkPreviewList
            rows={rows}
            onSetFile={setRowFile}
            onUpdateRow={updateRow}
            onRemoveRow={removeRow}
          />

          {/* Field reference */}
          <details className="text-xs text-gray-500 border rounded-xl p-3">
            <summary className="cursor-pointer font-semibold text-gray-700">
              📋 Supported CSV headers &amp; defaults
            </summary>
            <div className="mt-2 space-y-1 font-mono leading-relaxed">
              <div><span className="text-red-500">name</span> — required</div>
              <div><span className="text-red-500">price</span> — required, number ≥ 0</div>
              <div>description — default: empty</div>
              <div>category — default: <em>Main Course</em></div>
              <div>image_url — default: empty (upload per-row instead)</div>
              <div>is_available — default: <em>true</em></div>
              <div>is_veg — default: <em>true</em></div>
              <div>preparation_time — default: <em>30</em> (minutes)</div>
              <div>discount_percentage — default: <em>0</em> (0–100)</div>
              <div>category_id — default: null</div>
              <div>dish_timing — JSON string or blank; default: null (always available)</div>
              <div className="mt-2 text-gray-400">
                dish_timing example:
                {` {"type":"scheduled","enabled":true,"slots":[{"from":"09:00","to":"22:00","days":[0,1,2,3,4,5,6]}]}`}
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
