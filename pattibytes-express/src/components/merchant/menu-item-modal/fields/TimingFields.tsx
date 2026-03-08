'use client';

import { Clock, Plus, Trash2 } from 'lucide-react';
import { DAYS, DishTiming, FormState, IC, LC, TimingSlot } from '../types';

interface Props {
  timing:     DishTiming;
  onChange:   (timing: DishTiming) => void;
  onAutosave: (patch: Partial<FormState>) => void;
}

export function TimingFields({ timing, onChange, onAutosave }: Props) {
  // Every mutation goes through commit — keeps onChange + onAutosave in sync
  const commit = (next: DishTiming) => {
    onChange(next);
    onAutosave({ timing: next });
  };

  const toggleEnabled = () => commit({ ...timing, enabled: !timing.enabled });
  const setType       = (type: DishTiming['type']) => commit({ ...timing, type });

  const addSlot = () =>
    commit({
      ...timing,
      slots: [
        ...timing.slots,
        { days: [1, 2, 3, 4, 5], from: '09:00', to: '22:00' },
      ],
    });

  const removeSlot = (i: number) =>
    commit({ ...timing, slots: timing.slots.filter((_, idx) => idx !== i) });

  const updateSlot = (i: number, patch: Partial<TimingSlot>) =>
    commit({
      ...timing,
      slots: timing.slots.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    });

  const toggleDay = (slotIdx: number, day: number) => {
    const slot = timing.slots[slotIdx];
    const days = slot.days.includes(day)
      ? slot.days.filter(d => d !== day)
      : [...slot.days, day].sort((a, b) => a - b);
    updateSlot(slotIdx, { days });
  };

  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 space-y-4">

      {/* ── Header + toggle ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <span className="text-sm font-bold text-gray-900">Availability Schedule</span>
          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold tracking-wide">
            NEW
          </span>
        </div>

        {/* iOS-style toggle */}
        <button
          type="button"
          onClick={toggleEnabled}
          aria-checked={timing.enabled}
          role="switch"
          aria-label="Toggle availability schedule"
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${timing.enabled ? 'bg-primary' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
              ${timing.enabled ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* ── Disabled hint ────────────────────────────────────────────────── */}
      {!timing.enabled && (
        <p className="text-xs text-gray-400 leading-relaxed">
          Enable to restrict when this dish appears — e.g. breakfast only,
          weekdays only, or specific lunch / dinner hours.
        </p>
      )}

      {/* ── Enabled body ─────────────────────────────────────────────────── */}
      {timing.enabled && (
        <>
          {/* Type pills */}
          <div className="flex gap-2 flex-wrap">
            {(['always', 'scheduled'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition
                  ${timing.type === t
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {t === 'always' ? '🕐 Always Available' : '📅 Custom Schedule'}
              </button>
            ))}
          </div>

          {/* Always available */}
          {timing.type === 'always' && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              ✅ Dish is always available during the restaurant&apos;s opening hours.
            </p>
          )}

          {/* Scheduled slots */}
          {timing.type === 'scheduled' && (
            <div className="space-y-3">
              {timing.slots.map((slot, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-200 p-3 space-y-3"
                >
                  {/* Day pills */}
                  <div>
                    <label className={LC}>Active Days</label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {DAYS.map((d, di) => (
                        <button
                          key={di}
                          type="button"
                          onClick={() => toggleDay(i, di)}
                          className={`w-10 h-8 rounded-lg text-xs font-bold border transition
                            ${slot.days.includes(di)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    {slot.days.length === 0 && (
                      <p className="text-[11px] text-amber-600 mt-1.5">
                        ⚠ Select at least one day
                      </p>
                    )}
                  </div>

                  {/* Time range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LC}>From</label>
                      <input
                        type="time"
                        value={slot.from}
                        className={IC}
                        onChange={e => updateSlot(i, { from: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={LC}>To</label>
                      <input
                        type="time"
                        value={slot.to}
                        className={IC}
                        onChange={e => updateSlot(i, { to: e.target.value })}
                      />
                    </div>
                  </div>

                  {slot.from && slot.to && slot.from >= slot.to && (
                    <p className="text-[11px] text-red-500">
                      ⚠ &quot;To&quot; must be later than &quot;From&quot;
                    </p>
                  )}

                  {/* Remove slot — only shown when there are multiple */}
                  {timing.slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold transition"
                    >
                      <Trash2 size={12} /> Remove this slot
                    </button>
                  )}
                </div>
              ))}

              {/* Add slot */}
              <button
                type="button"
                onClick={addSlot}
                className="flex items-center gap-2 text-xs text-primary font-bold px-3 py-2
                  rounded-xl border border-primary/30 bg-orange-50 hover:bg-orange-100 transition"
              >
                <Plus size={13} /> Add Another Time Slot
              </button>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                Multiple slots supported — e.g. lunch 12:00–15:00 and dinner 19:00–23:00.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
