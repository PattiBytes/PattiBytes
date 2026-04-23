'use client';

interface Props { value: string; onChange: (v: string) => void; }

export function CsvTextArea({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Paste CSV content <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={8}
        spellCheck={false}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
      />
      <p className="text-xs text-gray-500 mt-1.5">
        Required: <span className="font-mono text-red-500">name</span>,{' '}
        <span className="font-mono text-red-500">price</span>.{' '}
        All others are optional with sensible defaults.{' '}
        <span className="font-mono">dish_timing</span> accepts a JSON string or leave blank.
      </p>
    </div>
  );
}

