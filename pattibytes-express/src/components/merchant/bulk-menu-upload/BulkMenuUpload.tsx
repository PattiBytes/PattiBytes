/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { menuService }         from '@/services/menu';

import { Row }              from './types';
import { firstSheetToObjects, normalizeRow } from './helpers';
import { UploadButtons }    from './UploadButtons';
import { TemplateButtons }  from './TemplateButtons';
import { CsvTextArea }      from './CsvTextArea';
import { BulkPreviewList }  from './BulkPreviewList';
import { ActionBar }        from './ActionBar';

interface Props { merchantId: string; onClose: () => void; onSuccess: () => void; }

export default function BulkMenuUploadModal({ merchantId, onClose, onSuccess }: Props) {
  const [rawText, setRawText] = useState(
    `name,description,price,category,image_url,is_available,is_veg,preparation_time,discount_percentage,category_id\n`
  );
  const [rows,    setRows]    = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving,  setSaving]  = useState(false);

  const previewCount = useMemo(() => rows.length, [rows]);

  const setRowFile = (i: number, file: File | null) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, _file: file } : r));

  const parseObjects = (objs: any[]) => {
    const errs: string[] = []; const out: Row[] = [];
    objs.forEach((o, i) => {
      const { row, err } = normalizeRow(o, i);
      if (err) errs.push(err);
      if (row) out.push(row);
    });
    setRows(out);
    if (errs.length)         toast.error(errs.slice(0, 3).join(' | '));
    if (out.length)          toast.success(`Parsed ${out.length} row(s)`);
    if (!out.length && !errs.length) toast.error('No rows found');
  };

  const parseFromCsvText = () => {
    setParsing(true);
    try {
      const res = Papa.parse(rawText, { header: true, skipEmptyLines: true, transformHeader: h => String(h || '').trim().toLowerCase() });
      if (res.errors?.length) toast.error(res.errors.slice(0, 2).map(e => e.message).join(' | '));
      parseObjects((res.data as any[]) || []);
    } finally { setParsing(false); }
  };

  const handleFile = async (file: File) => {
    setRows([]); const name = file.name.toLowerCase();
    try {
      setParsing(true);
      if (name.endsWith('.csv')) {
        Papa.parse(file, { header: true, skipEmptyLines: true, transformHeader: h => String(h || '').trim().toLowerCase(),
          complete: r => { setParsing(false); parseObjects((r.data as any[]) || []); },
          error: () => { setParsing(false); toast.error('CSV parse failed'); },
        }); return;
      }
      if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        parseObjects(firstSheetToObjects(XLSX.read(await file.arrayBuffer()))); return;
      }
      if (name.endsWith('.json')) {
        const parsed = JSON.parse(await file.text());
        parseObjects(Array.isArray(parsed) ? parsed : Array.isArray(parsed?.items) ? parsed.items : []); return;
      }
      toast.error('Unsupported file. Upload CSV / XLSX / XLS / JSON');
    } catch (e: any) { toast.error(e?.message || 'Failed to read file'); }
    finally { setParsing(false); }
  };

  const saveAll = async () => {
    if (!rows.length) return toast.error('Parse data first');
    setSaving(true);
    try {
      const fixed: Row[] = [];
      for (const r of rows) {
        let imageUrl = r.image_url;
        if (!imageUrl && r._file) imageUrl = await uploadToCloudinary(r._file, 'menu-items');
        fixed.push({ ...r, image_url: imageUrl || '' });
      }
      await menuService.createMenuItemsBulk(
        fixed.map(r => ({
          merchant_id: merchantId, name: r.name, description: r.description,
          price: r.price, category: r.category, image_url: r.image_url,
          is_available: r.is_available, is_veg: r.is_veg,
          preparation_time: r.preparation_time, discount_percentage: r.discount_percentage,
          category_id: r.category_id,
        }))
      );
      toast.success(`Uploaded ${fixed.length} item(s)`); onSuccess(); onClose();
    } catch (e: any) { toast.error(e?.message || 'Bulk upload failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Upload Menu Items</h2>
            <p className="text-xs text-gray-600 mt-1">Upload CSV / Excel / JSON, or paste CSV text. Images: use image_url or upload per-row.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-5">
          <UploadButtons    onFile={handleFile} />
          <TemplateButtons />
          <ActionBar
            parsing={parsing} saving={saving} previewCount={previewCount}
            onParseCsv={parseFromCsvText} onSaveAll={saveAll}
            onClear={() => { setRows([]); toast.info('Cleared preview'); }}
          />
          <CsvTextArea value={rawText} onChange={setRawText} />
          <BulkPreviewList rows={rows} onSetFile={setRowFile} />
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
