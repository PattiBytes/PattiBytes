'use client';
import { useMemo } from 'react';
import { MapPinned, DollarSign, Navigation, Ruler, Copy, CheckCircle2, EyeOff, Settings2 } from 'lucide-react';
import type { Settings, DayKey } from './types';
import { Toggle } from './Toggle';
import { DAYS, asNum, defaultSchedule, dayKeyForNow } from './utils';

interface Props { settings: Settings; onChange: (s: Settings) => void; }

export function DeliverySection({ settings, onChange }: Props) {
  const sched = settings.delivery_fee_schedule ?? defaultSchedule(settings.delivery_fee);
  const showToCustomer = sched?.ui?.show_to_customer ?? true;
  const todayKey = useMemo(() => dayKeyForNow(sched?.timezone ?? 'Asia/Kolkata'), [sched?.timezone]);
  const todayRule = useMemo(() => {
    const rule = sched?.weekly?.[todayKey];
    return { key: todayKey, enabled: rule?.enabled ?? true, fee: rule?.fee ?? settings.delivery_fee };
  }, [sched, todayKey, settings.delivery_fee]);

  const setDay = (key: DayKey, patch: Partial<{ enabled: boolean; fee: number }>) =>
    onChange({ ...settings, delivery_fee_schedule: { ...sched, weekly: { ...sched.weekly, [key]: { ...sched.weekly[key], ...patch } } } });

  const setAllDays = (enabled: boolean, fee?: number) => {
    const weekly = { ...sched.weekly };
    for (const { key } of DAYS) weekly[key] = { enabled, fee: Math.max(0, fee !== undefined ? fee : asNum(sched.weekly[key]?.fee, settings.delivery_fee)) };
    onChange({ ...settings, delivery_fee_schedule: { ...sched, weekly } });
  };

  const copyDayToAll = (from: DayKey) => {
    const src = sched.weekly[from];
    const weekly = { ...sched.weekly };
    for (const { key } of DAYS) weekly[key] = { ...src };
    onChange({ ...settings, delivery_fee_schedule: { ...sched, weekly } });
  };

  return (
    <div className="space-y-6">
      {/* Toggles row */}
      <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-orange-50 to-yellow-50 p-4 rounded-xl border border-orange-200">
        <Toggle checked={settings.delivery_fee_enabled} onChange={v => onChange({ ...settings, delivery_fee_enabled: v })} label="Enable Delivery Fee" />
        <Toggle checked={showToCustomer} disabled={!settings.delivery_fee_enabled}
          onChange={v => onChange({ ...settings, delivery_fee_schedule: { ...sched, ui: { ...sched.ui, show_to_customer: v } } })}
          label="Show Fee to Customers" />
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${settings.delivery_fee_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
          {settings.delivery_fee_enabled ? <><CheckCircle2 size={12} /> Active</> : <><EyeOff size={12} /> Disabled</>}
        </span>
      </div>

      {/* Delivery area config */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><MapPinned size={18} className="text-blue-600" /> Delivery Area Pricing</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Ruler size={14} className="text-blue-600" /> Base Radius (km)</label>
            <input type="number" min={0} step={0.5} value={settings.base_delivery_radius_km}
              onChange={e => onChange({ ...settings, base_delivery_radius_km: Math.max(0, Number(e.target.value)) })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-400 font-semibold text-lg" />
            <p className="text-xs text-gray-500 mt-1">Flat base fee within this radius</p>
          </div>
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><DollarSign size={14} className="text-green-600" /> Fee per KM Beyond Base</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
              <input type="number" min={0} step={1} value={settings.per_km_fee_beyond_base}
                onChange={e => onChange({ ...settings, per_km_fee_beyond_base: Math.max(0, Number(e.target.value)) })}
                className="w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-400 font-semibold text-lg" />
            </div>
          </div>
        </div>

        {/* Pricing example */}
        <div className="mt-4 bg-white rounded-xl p-4 border-2 border-green-200">
          <p className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2"><Navigation size={14} className="text-green-600" /> Pricing Example (Today: {todayKey.toUpperCase()})</p>
          <div className="text-xs text-gray-700 space-y-1">
            <p>📍 Within <strong>{settings.base_delivery_radius_km}km</strong> → <span className="text-primary font-bold">₹{todayRule.fee}</span></p>
            <p>📍 7km order (2km beyond) → <span className="text-primary font-bold">₹{todayRule.fee + 2 * settings.per_km_fee_beyond_base}</span></p>
            <p>📍 10km order (5km beyond) → <span className="text-primary font-bold">₹{todayRule.fee + 5 * settings.per_km_fee_beyond_base}</span></p>
          </div>
        </div>
      </div>

      {/* Base fee + timezone */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Base Delivery Fee (₹)</label>
          <input type="number" min={0} value={settings.delivery_fee}
            onChange={e => onChange({ ...settings, delivery_fee: Math.max(0, Number(e.target.value)) })}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Settings2 size={14} /> Timezone</label>
          <input type="text" value={sched.timezone ?? 'Asia/Kolkata'}
            onChange={e => onChange({ ...settings, delivery_fee_schedule: { ...sched, timezone: e.target.value || 'Asia/Kolkata' } })}
            placeholder="Asia/Kolkata" className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary text-sm" />
        </div>
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 flex flex-col justify-center">
          <p className="text-xs text-gray-600 font-semibold">Today&apos;s Rule</p>
          <p className="text-xl font-extrabold text-gray-900 mt-1">{todayRule.key.toUpperCase()} · {todayRule.enabled ? `₹${todayRule.fee}` : 'Disabled'}</p>
          <p className="text-xs text-gray-500 mt-1">{showToCustomer ? 'Visible to customers' : 'Hidden from customers'}</p>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Enable All', icon: <CheckCircle2 size={14} />, action: () => setAllDays(true, settings.delivery_fee), color: 'hover:bg-green-50 hover:border-green-300' },
          { label: 'Disable All', icon: <EyeOff size={14} />, action: () => setAllDays(false, 0), color: 'hover:bg-red-50 hover:border-red-300' },
          { label: 'Copy Mon→All', icon: <Copy size={14} />, action: () => copyDayToAll('mon'), color: 'hover:bg-blue-50 hover:border-blue-300' },
        ].map(b => (
          <button key={b.label} type="button" onClick={b.action}
            disabled={!settings.delivery_fee_enabled}
            className={`px-4 py-2 rounded-xl border-2 bg-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 transition-colors ${b.color}`}>
            {b.icon} {b.label}
          </button>
        ))}
      </div>

      {/* Weekly schedule */}
      <div className="rounded-xl border overflow-hidden bg-white shadow-sm">
        <div className="px-4 py-3 border-b bg-gray-50 font-bold text-gray-900">Weekly Delivery Fee Schedule</div>
        <div className="divide-y">
          {DAYS.map(({ key, label }) => {
            const rule = sched.weekly?.[key] ?? { enabled: true, fee: settings.delivery_fee };
            return (
              <div key={key} className="px-4 py-3 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="w-10 font-bold text-gray-900 text-sm">{label}</span>
                <Toggle size="sm" checked={!!rule.enabled} disabled={!settings.delivery_fee_enabled}
                  onChange={v => setDay(key, { enabled: v })} label="On" />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-gray-400 text-sm">₹</span>
                  <input type="number" min={0} value={asNum(rule.fee, settings.delivery_fee)}
                    disabled={!settings.delivery_fee_enabled || !rule.enabled}
                    onChange={e => setDay(key, { fee: Math.max(0, asNum(e.target.value, 0)) })}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm font-semibold disabled:bg-gray-100 focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => copyDayToAll(key)} disabled={!settings.delivery_fee_enabled}
                    title="Copy to all" className="px-3 py-2 rounded-lg border bg-white text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1">
                    <Copy size={12} /> All
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
