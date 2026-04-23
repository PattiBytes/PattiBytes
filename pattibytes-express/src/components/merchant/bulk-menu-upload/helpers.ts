/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx';
import { Row, DishTiming } from './types';

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function firstSheetToObjects(workbook: XLSX.WorkBook): any[] {
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }) as any[];
}

/** Pick first truthy value by trying multiple key aliases on a normalised object. */
function pick(obj: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/** Normalise every key: trim, lowercase, collapse spaces/dashes to underscores. */
function normaliseKeys(obj: any): Record<string, any> {
  const out: Record<string, any> = {};
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const nk = String(k).trim().toLowerCase().replace(/[\s\-]+/g, '_');
      out[nk] = v;
    }
  }
  return out;
}

function parseBool(v: any, fallback: boolean): boolean {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(s)) return true;
  if (['false', '0', 'no', 'n'].includes(s)) return false;
  return fallback;
}

function parseNum(v: any, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function parseDishTiming(v: any): DishTiming | null {
  if (!v || v === '' || v === 'null' || v === 'undefined') return null;
  if (typeof v === 'object') return v as DishTiming;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s || s === 'null') return null;
    try { return JSON.parse(s) as DishTiming; } catch { return null; }
  }
  return null;
}

export function normalizeRow(obj: any, i: number): { row?: Row; err?: string } {
  const n = normaliseKeys(obj);

  const name = String(pick(n, 'name') ?? '').trim();
  const priceRaw = pick(n, 'price');
  const price = parseNum(priceRaw, NaN);

  if (!name)                           return { err: `Row ${i + 1}: "name" is required` };
  if (!Number.isFinite(price) || price < 0)
    return { err: `Row ${i + 1}: "price" is invalid (got: ${priceRaw})` };

  const category = String(
    pick(n, 'category', 'cat') ?? 'Main Course'
  ).trim() || 'Main Course';

  const dishTimingRaw = pick(n, 'dish_timing', 'dishtiming', 'timing', 'schedule');

  return {
    row: {
      name,
      description : String(pick(n, 'description', 'desc') ?? '').trim(),
      price,
      category,
      image_url   : String(pick(n, 'image_url', 'imageurl', 'image', 'img') ?? '').trim(),
      is_available: parseBool(pick(n, 'is_available', 'isavailable', 'available'), true),
      is_veg      : parseBool(pick(n, 'is_veg', 'isveg', 'veg', 'vegetarian'), true),
      preparation_time: Math.max(0, parseNum(
        pick(n, 'preparation_time', 'preparationtime', 'prep_time', 'preptime', 'prep'), 30
      )),
      discount_percentage: Math.min(100, Math.max(0, parseNum(
        pick(n, 'discount_percentage', 'discountpercentage', 'discount', 'disc'), 0
      ))),
      category_id: String(pick(n, 'category_id', 'categoryid') ?? '').trim() || null,
      dish_timing: parseDishTiming(dishTimingRaw),
      _file: null,
    },
  };
}

