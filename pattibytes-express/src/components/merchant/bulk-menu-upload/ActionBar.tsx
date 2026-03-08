'use client';
import { Loader2, RefreshCw } from 'lucide-react';

interface Props {
  parsing:      boolean;
  saving:       boolean;
  previewCount: number;
  onParseCsv:   () => void;
  onSaveAll:    () => void;
  onClear:      () => void;
}

export function ActionBar({ parsing, saving, previewCount, onParseCsv, onSaveAll, onClear }: Props) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <button type="button" onClick={onParseCsv} disabled={parsing}
        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold disabled:opacity-50 flex items-center gap-2">
        {parsing && <Loader2 size={14} className="animate-spin" />}
        {parsing ? 'Parsing…' : 'Parse pasted CSV'}
      </button>
      <button type="button" onClick={onSaveAll} disabled={saving || !previewCount}
        className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold disabled:opacity-50 flex items-center gap-2">
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? 'Saving…' : `Save (${previewCount})`}
      </button>
      <button type="button" onClick={onClear}
        className="px-4 py-2 rounded-xl border font-semibold hover:bg-gray-50 flex items-center gap-2">
        <RefreshCw size={14} /> Clear
      </button>
    </div>
  );
}
