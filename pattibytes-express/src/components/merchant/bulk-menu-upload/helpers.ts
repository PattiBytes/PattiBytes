/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';
import { Row } from './types';

export function parseBool(v: any, fallback: boolean) {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return fallback;
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
}
export function parseNum(v: any, fallback: number) {
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : fallback;
}
export function normalizeRow(obj: any, i: number): { row?: Row; err?: string } {
  const name  = String(obj?.name  ?? '').trim();
  const price = parseNum(obj?.price, NaN);
  if (!name)                   return { err: `Row ${i + 1}: name is required` };
  if (!Number.isFinite(price)) return { err: `Row ${i + 1}: price is invalid` };
  return {
    row: {
      name,
      description:         String(obj?.description ?? '').trim(),
      price,
      category:            String(obj?.category ?? 'Main Course').trim() || 'Main Course',
      image_url:           String(obj?.image_url ?? '').trim(),
      is_available:        parseBool(obj?.is_available, true),
      is_veg:              parseBool(obj?.is_veg, true),
      preparation_time:    parseNum(obj?.preparation_time, 30),
      discount_percentage: parseNum(obj?.discount_percentage, 0),
      category_id:         (String(obj?.category_id ?? '').trim() || '') || null,
      _file: null,
    },
  };
}
export function firstSheetToObjects(workbook: XLSX.WorkBook): any[] {
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
