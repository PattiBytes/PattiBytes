'use client';
interface Props { value: string; onChange: (v: string) => void; }

export function CsvTextArea({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Paste CSV content (optional)</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={8}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-xs" />
      <p className="text-xs text-gray-500 mt-2">
        Required headers: <span className="font-mono">name, price</span>. Others optional.
      </p>
    </div>
  );
}
