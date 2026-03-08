'use client';
import { FileJson, FileText, Sheet } from 'lucide-react';

interface Props { onFile: (file: File) => void; }

const BTN = 'inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50 font-semibold text-sm';

export function UploadButtons({ onFile }: Props) {
  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) onFile(e.target.files[0]);
  };
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <label className={BTN}><FileText size={16} /> Upload CSV    <input type="file" accept=".csv,text/csv"                 className="hidden" onChange={handle} /></label>
      <label className={BTN}><Sheet    size={16} /> Upload Excel  <input type="file" accept=".xlsx,.xls"                    className="hidden" onChange={handle} /></label>
      <label className={BTN}><FileJson size={16} /> Upload JSON   <input type="file" accept=".json,application/json"        className="hidden" onChange={handle} /></label>
    </div>
  );
}
