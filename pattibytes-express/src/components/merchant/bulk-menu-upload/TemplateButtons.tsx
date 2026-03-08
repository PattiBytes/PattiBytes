'use client';
import { Download } from 'lucide-react';
import { downloadCsvTemplate, downloadExcelTemplate, downloadJsonTemplate } from './templateUtils';

const BTN = 'px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50 flex items-center gap-2 text-sm';

export function TemplateButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={downloadCsvTemplate}   className={BTN}><Download size={16} /> CSV template</button>
      <button type="button" onClick={downloadExcelTemplate} className={BTN}><Download size={16} /> Excel template</button>
      <button type="button" onClick={downloadJsonTemplate}  className={BTN}><Download size={16} /> JSON template</button>
    </div>
  );
}
