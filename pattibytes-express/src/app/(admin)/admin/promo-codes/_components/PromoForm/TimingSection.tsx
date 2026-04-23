'use client';
import type { PromoFormState } from '../../_types';

const DAYS = [
  { n: 1, label: 'Mon' }, { n: 2, label: 'Tue' }, { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' }, { n: 5, label: 'Fri' }, { n: 6, label: 'Sat' }, { n: 7, label: 'Sun' },
];

interface Props {
  form   : PromoFormState;
  update (patch: Partial<PromoFormState>): void;
}

export function TimingSection({ form, update }: Props) {
  const toggleDay = (n: number) => {
    const next = form.valid_days.includes(n)
      ? form.valid_days.filter(x => x !== n)
      : [...form.valid_days, n].sort((a, b) => a - b);
    update({ valid_days: next });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-gray-500 uppercase">Timing & Validity</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Valid From</label>
          <input type="date" value={form.valid_from} onChange={e => update({ valid_from: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary bg-white"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Valid Until</label>
          <input type="date" value={form.valid_until} onChange={e => update({ valid_until: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary bg-white"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Start Time (daily)</label>
          <input type="time" value={form.start_time} onChange={e => update({ start_time: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary bg-white"/>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">End Time (daily)</label>
          <input type="time" value={form.end_time} onChange={e => update({ end_time: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-primary bg-white"/>
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Valid Days (empty = every day)</label>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map(d => (
            <button key={d.n} type="button" onClick={() => toggleDay(d.n)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                form.valid_days.includes(d.n)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary'
              }`}>
              {d.label}
            </button>
          ))}
          {form.valid_days.length > 0 && (
            <button type="button" onClick={() => update({ valid_days: [] })}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 text-red-500 hover:bg-red-50">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


