/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck, ShieldX, DollarSign, PackagePlus,
  Trash2, FileEdit, ToggleLeft, Image as ImageIcon,
  Percent, Layers, Clock, RefreshCw, Loader2,
  ChevronDown, Search, Users, Lock, Unlock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Toggle } from './Toggle';
import type { Merchant, MerchantPermissionKey, MerchantPermissions } from './types';
import { toast } from 'react-toastify';

/* ── Permission definitions ──────────────────────────── */
interface PermDef {
  key: MerchantPermissionKey;
  label: string;
  description: string;
  icon: React.ReactNode;
  dangerous?: boolean;
}

const PERMISSION_DEFS: PermDef[] = [
  { key: 'can_add_items',          label: 'Add Menu Items',        description: 'Create new items in their menu',              icon: <PackagePlus size={16} />, },
  { key: 'can_delete_items',       label: 'Delete Menu Items',     description: 'Permanently remove items from their menu',     icon: <Trash2 size={16} />,      dangerous: true },
  { key: 'can_edit_price',         label: 'Edit Item Price',       description: 'Change the price of existing menu items',      icon: <DollarSign size={16} />,  dangerous: true },
  { key: 'can_edit_description',   label: 'Edit Description',      description: 'Modify name and description of items',         icon: <FileEdit size={16} />, },
  { key: 'can_toggle_availability',label: 'Toggle Availability',   description: 'Mark items as available or unavailable',       icon: <ToggleLeft size={16} />, },
  { key: 'can_edit_images',        label: 'Edit Item Images',      description: 'Upload and change item photos',                icon: <ImageIcon size={16} />, },
  { key: 'can_manage_discount',    label: 'Set Discounts',         description: 'Apply discount percentage to items',           icon: <Percent size={16} />,     dangerous: true },
  { key: 'can_manage_categories',  label: 'Manage Categories',     description: 'Create and assign item categories',            icon: <Layers size={16} />, },
  { key: 'can_edit_timing',        label: 'Edit Dish Timing',      description: 'Set dish availability time windows',           icon: <Clock size={16} />, },
];

const DEFAULT_GLOBAL: MerchantPermissions = {
  can_add_items:           true,
  can_delete_items:        true,
  can_edit_price:          false,  // locked by trigger
  can_edit_description:    true,
  can_toggle_availability: true,
  can_edit_images:         true,
  can_manage_discount:     false,
  can_manage_categories:   true,
  can_edit_timing:         true,
};

/* ── Component ───────────────────────────────────────── */
interface Props {
  appSettingsId?: string;
  adminPreferences?: Record<string, unknown>;
  onPreferencesChange: (prefs: Record<string, unknown>) => void;
}

export function MerchantPermissionsSection({ appSettingsId, adminPreferences, onPreferencesChange }: Props) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(true);
  const [savingOverride, setSavingOverride] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);

  // Parse permissions from admin_preferences
  const globalPerms: MerchantPermissions = {
    ...DEFAULT_GLOBAL,
    ...(adminPreferences?.merchant_permissions as { global?: Partial<MerchantPermissions> })?.global,
  };

  const overrides: Record<string, Partial<MerchantPermissions>> =
    (adminPreferences?.merchant_permissions as { overrides?: Record<string, Partial<MerchantPermissions>> })?.overrides ?? {};

  /* ── Load merchants ── */
  useEffect(() => {
    (async () => {
      setLoadingMerchants(true);
      try {
        const { data, error } = await supabase.from('merchants').select('id,business_name,logo_url,is_active,city').order('business_name');
        if (error) throw error;
        setMerchants((data ?? []) as Merchant[]);
      } catch (e: unknown) {
        toast.error((e as Error)?.message ?? 'Failed to load merchants');
      } finally {
        setLoadingMerchants(false);
      }
    })();
  }, []);

  const filteredMerchants = useMemo(() =>
    merchants.filter(m => m.business_name.toLowerCase().includes(search.toLowerCase())),
    [merchants, search]
  );

  /* ── Helpers ── */
  const setGlobalPerm = (key: MerchantPermissionKey, value: boolean) => {
    const newPrefs = {
      ...(adminPreferences ?? {}),
      merchant_permissions: {
        global: { ...globalPerms, [key]: value },
        overrides,
      },
    };
    onPreferencesChange(newPrefs);
  };

  const setOverridePerm = (merchantId: string, key: MerchantPermissionKey, value: boolean | null) => {
    const current = { ...(overrides[merchantId] ?? {}) };
    if (value === null) {
      delete current[key];
    } else {
      current[key] = value;
    }
    const newOverrides = { ...overrides };
    if (Object.keys(current).length === 0) {
      delete newOverrides[merchantId];
    } else {
      newOverrides[merchantId] = current;
    }
    const newPrefs = {
      ...(adminPreferences ?? {}),
      merchant_permissions: { global: globalPerms, overrides: newOverrides },
    };
    onPreferencesChange(newPrefs);
  };

  const clearOverride = (merchantId: string) => {
    const newOverrides = { ...overrides };
    delete newOverrides[merchantId];
    onPreferencesChange({ ...(adminPreferences ?? {}), merchant_permissions: { global: globalPerms, overrides: newOverrides } });
    toast.success('Override cleared — merchant now follows global permissions');
  };

  const getEffectivePerm = (merchantId: string, key: MerchantPermissionKey): boolean => {
    const override = overrides[merchantId];
    if (override && key in override) return override[key] as boolean;
    return globalPerms[key];
  };

  const merchantHasOverride = (merchantId: string) => !!overrides[merchantId] && Object.keys(overrides[merchantId]).length > 0;

  /* ── Save overrides to DB ── */
  const savePermissions = async () => {
    if (!appSettingsId) return;
    setSavingOverride(true);
    try {
      const newPrefs = {
        ...(adminPreferences ?? {}),
        merchant_permissions: { global: globalPerms, overrides },
      };
      const { error } = await supabase.from('app_settings').update({ admin_preferences: newPrefs }).eq('id', appSettingsId);
      if (error) throw error;
      toast.success('Permissions saved!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to save permissions');
    } finally {
      setSavingOverride(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Header note ── */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-900">About Permissions</p>
          <p className="text-xs text-amber-800 mt-1 leading-relaxed">
            These settings control what merchants can do in the app UI.
            Price editing is <strong>also enforced at the database level</strong> via a trigger —
            disabling <em>Edit Item Price</em> here adds a UI block on top of that protection.
          </p>
        </div>
      </div>

      {/* ── Global permissions ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-100 border border-purple-200">
              <ShieldCheck size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900">Global Permissions</h3>
              <p className="text-xs text-gray-500">Applies to all merchants unless overridden below</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const allOn = Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, true])) as MerchantPermissions;
                onPreferencesChange({ ...(adminPreferences ?? {}), merchant_permissions: { global: allOn, overrides } });
              }}
              className="px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-bold hover:bg-green-200 transition flex items-center gap-1">
              <Unlock size={11} /> Allow All
            </button>
            <button
              onClick={() => {
                const allOff = Object.fromEntries(PERMISSION_DEFS.map(p => [p.key, false])) as MerchantPermissions;
                onPreferencesChange({ ...(adminPreferences ?? {}), merchant_permissions: { global: allOff, overrides } });
              }}
              className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition flex items-center gap-1">
              <Lock size={11} /> Lock All
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PERMISSION_DEFS.map(p => (
            <div
              key={p.key}
              className={`group relative rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5
                ${globalPerms[p.key]
                  ? p.dangerous ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'
                  : 'border-gray-200 bg-gray-50/60'
                }`}
              style={{ perspective: '600px' }}
            >
              {/* Dangerous badge */}
              {p.dangerous && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[9px] font-bold uppercase tracking-wide">
                  Sensitive
                </span>
              )}

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 transition-colors
                  ${globalPerms[p.key] ? 'bg-white shadow-sm text-primary' : 'bg-gray-200 text-gray-400'}`}>
                  {p.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{p.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{p.description}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className={`text-xs font-bold ${globalPerms[p.key] ? 'text-green-600' : 'text-gray-400'}`}>
                  {globalPerms[p.key] ? '✓ Allowed' : '✗ Blocked'}
                </span>
                <Toggle
                  checked={globalPerms[p.key]}
                  onChange={v => setGlobalPerm(p.key, v)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-merchant overrides ── */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 border border-blue-200">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900">Per-Merchant Overrides</h3>
              <p className="text-xs text-gray-500">Grant or restrict specific permissions for individual merchants</p>
            </div>
          </div>
          {Object.keys(overrides).length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {Object.keys(overrides).length} override{Object.keys(overrides).length !== 1 ? 's' : ''} active
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search merchants…"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary text-sm" />
        </div>

        {loadingMerchants ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMerchants.map(m => {
              const hasOverride = merchantHasOverride(m.id);
              const isExpanded = expandedMerchant === m.id;
              return (
                <div key={m.id}
                  className={`rounded-2xl border-2 overflow-hidden transition-all duration-300
                    ${hasOverride ? 'border-blue-300 shadow-md shadow-blue-100' : 'border-gray-200'}`}>

                  {/* Merchant row header */}
                  <button
                    type="button"
                    onClick={() => setExpandedMerchant(isExpanded ? null : m.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                      {m.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={m.logo_url} alt={m.business_name} className="w-full h-full object-cover" />
                        : <span className="text-primary font-extrabold text-sm">{m.business_name[0]}</span>}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-gray-900">{m.business_name}</p>
                      <p className="text-xs text-gray-400">{m.city ?? '—'}</p>
                    </div>
                    {hasOverride && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold mr-1">
                        {Object.keys(overrides[m.id]).length} override{Object.keys(overrides[m.id]).length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded override matrix */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {hasOverride && (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                          <p className="text-xs text-blue-800 font-medium flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-blue-600" />
                            This merchant has custom permission overrides
                          </p>
                          <button onClick={() => clearOverride(m.id)}
                            className="text-xs text-red-600 font-bold hover:underline flex items-center gap-1">
                            <Trash2 size={11} /> Clear All
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {PERMISSION_DEFS.map(p => {
                          const overrideVal = overrides[m.id]?.[p.key];
                          const effective = getEffectivePerm(m.id, p.key);
                          const isOverridden = overrideVal !== undefined;

                          return (
                            <div key={p.key}
                              className={`rounded-xl border p-3 transition-all
                                ${isOverridden
                                  ? overrideVal ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
                                  : 'border-gray-200 bg-white'}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`${effective ? 'text-primary' : 'text-gray-300'}`}>{p.icon}</span>
                                <span className="text-xs font-bold text-gray-800 flex-1 leading-tight">{p.label}</span>
                                {isOverridden && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${overrideVal ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                    override
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {/* Allow / Block / Default buttons */}
                                <button
                                  onClick={() => setOverridePerm(m.id, p.key, true)}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition border ${overrideVal === true ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-700'}`}>
                                  Allow
                                </button>
                                <button
                                  onClick={() => setOverridePerm(m.id, p.key, false)}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition border ${overrideVal === false ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-200 hover:border-red-300 hover:text-red-700'}`}>
                                  Block
                                </button>
                                <button
                                  onClick={() => setOverridePerm(m.id, p.key, null)}
                                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition border ${!isOverridden ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>
                                  Default
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Save button ── */}
      <div className="border-t pt-4 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Changes to global permissions take effect immediately for all merchants.
          Per-merchant overrides are applied on top.
        </p>
        <button
          onClick={savePermissions}
          disabled={savingOverride || !appSettingsId}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:scale-100"
        >
          {savingOverride ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {savingOverride ? 'Saving…' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}
