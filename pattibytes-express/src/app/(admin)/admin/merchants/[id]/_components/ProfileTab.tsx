/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import {
  Link as LinkIcon, MapPin, X, Clock, BadgePercent,
  Building2, Phone, Mail, Globe, Truck, ShoppingBag, ChefHat,
} from 'lucide-react';
import ImageUpload from '@/components/common/ImageUpload';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import MapLocationPicker from '@/components/common/MapLocationPicker';
import { Loader2 } from 'lucide-react';
import {
  MerchantRow, cx,
  parseCuisineToText,
  safeAddrText,
  formatTimeDisplay,
  isOvernightShift,
} from './types';

interface Props {
  merchantId: string;
  form: MerchantRow;
  loading: boolean;
  onChange: (patch: Partial<MerchantRow>) => void;
}

// ── Tiny reusable field wrapper ──────────────────────────────────────────────
function Field({
  label, hint, span2, children,
}: {
  label: string; hint?: string; span2?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={cx('min-w-0', span2 && 'lg:col-span-2')}>
      <label className="block text-sm font-semibold text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

// ── Input helpers ────────────────────────────────────────────────────────────
const IC = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary transition';

// ── Section card wrapper ─────────────────────────────────────────────────────
function Section({ title, icon, gradient, children }: {
  title: string; icon: React.ReactNode; gradient?: string; children: React.ReactNode;
}) {
  return (
    <div className={cx(
      'rounded-2xl border p-4 sm:p-5 lg:col-span-2',
      gradient ?? 'bg-white'
    )}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 flex items-center justify-center rounded-xl bg-white border shadow-sm">
          {icon}
        </div>
        <p className="text-sm font-extrabold text-gray-900">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function ProfileTab({ merchantId, form, loading, onChange }: Props) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationMode, setLocationMode] = useState<'search' | 'map'>('search');

  const set = (patch: Partial<MerchantRow>) => onChange(patch);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-5">

        {/* ── Images ───────────────────────────────────────────────────── */}
        <div className="rounded-2xl border p-4 space-y-3 bg-white">
          <p className="text-sm font-extrabold text-gray-900">Logo</p>
          <div className="h-32">
            <ImageUpload
              type="profile"
              folder={`merchants/${merchantId}/logo`}
              currentImage={form.logo_url || ''}
              onUpload={(url: string) => set({ logo_url: url })}
            />
          </div>
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className={IC}
              placeholder="https://…"
              value={form.logo_url || ''}
              onChange={e => set({ logo_url: e.target.value })}
            />
          </div>
        </div>

        <div className="rounded-2xl border p-4 space-y-3 bg-white">
          <p className="text-sm font-extrabold text-gray-900">Banner</p>
          <div className="h-32">
            <ImageUpload
              type="banner"
              folder={`merchants/${merchantId}/banner`}
              currentImage={form.banner_url || ''}
              onUpload={(url: string) => set({ banner_url: url })}
            />
          </div>
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              className={IC}
              placeholder="https://…"
              value={form.banner_url || ''}
              onChange={e => set({ banner_url: e.target.value })}
            />
          </div>
        </div>

        {/* ── Basic info ───────────────────────────────────────────────── */}
        <Section title="Basic Information" icon={<Building2 className="w-4 h-4 text-blue-500" />}>
          <div className="grid lg:grid-cols-2 gap-4">
            <Field label="Business Name">
              <input
                className={IC}
                value={form.business_name || ''}
                onChange={e => set({ business_name: e.target.value })}
                placeholder="Patti Bites Restaurant"
              />
            </Field>

            <Field label="Business Type">
              <select
                className={IC}
                value={form.business_type || 'restaurant'}
                onChange={e => set({ business_type: e.target.value })}
              >
                {['restaurant', 'cafe', 'bakery', 'cloud_kitchen', 'food_truck', 'sweet_shop', 'dhaba', 'other'].map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </Field>

            <Field label="Phone" span2={false}>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={cx(IC, 'pl-9')}
                  value={form.phone || ''}
                  onChange={e => set({ phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={cx(IC, 'pl-9')}
                  type="email"
                  value={form.email || ''}
                  onChange={e => set({ email: e.target.value })}
                  placeholder="owner@restaurant.com"
                />
              </div>
            </Field>

            <Field label="Cuisine Types" hint="Comma-separated" span2>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  className={cx(IC, 'pl-9')}
                  value={parseCuisineToText(form.cuisine_types)}
                  onChange={e => set({ cuisine_types: e.target.value })}
                  placeholder="North Indian, Chinese, Fast Food"
                />
              </div>
            </Field>

            <Field label="Description" span2>
              <textarea
                rows={3}
                className={cx(IC, 'resize-none')}
                value={form.description || ''}
                onChange={e => set({ description: e.target.value })}
                placeholder="Tell customers about your restaurant…"
              />
            </Field>
          </div>
        </Section>

        {/* ── Location ─────────────────────────────────────────────────── */}
        <Section title="Location" icon={<MapPin className="w-4 h-4 text-red-500" />}>
          <div className="grid lg:grid-cols-2 gap-4">
            <Field label="Address" span2>
              <div className="flex items-center gap-2">
                <input
                  className={cx(IC, 'flex-1')}
                  value={safeAddrText(form.address)}
                  onChange={e => set({ address: e.target.value })}
                  placeholder="Full address"
                />
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="shrink-0 px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold text-sm flex items-center gap-1.5 transition"
                >
                  <MapPin className="w-4 h-4 text-primary" /> Update
                </button>
              </div>
              {(form.latitude && form.longitude) && (
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {form.latitude?.toFixed(6)}, {form.longitude?.toFixed(6)}
                </p>
              )}
            </Field>

            <Field label="City">
              <input className={IC} value={form.city || ''} onChange={e => set({ city: e.target.value })} placeholder="Patti" />
            </Field>

            <Field label="State">
              <input className={IC} value={form.state || ''} onChange={e => set({ state: e.target.value })} placeholder="Punjab" />
            </Field>

            <Field label="Postal Code">
              <input className={IC} value={form.postal_code || ''} onChange={e => set({ postal_code: e.target.value })} placeholder="143416" />
            </Field>
          </div>
        </Section>

        {/* ── Delivery & Operations ────────────────────────────────────── */}
        <Section title="Delivery & Operations" icon={<Truck className="w-4 h-4 text-green-600" />}>
          <div className="grid lg:grid-cols-3 gap-4">
            <Field label="Delivery Radius (km)">
              <input
                type="number" min={0} step={0.5}
                className={IC}
                value={Number(form.delivery_radius_km ?? 0)}
                onChange={e => set({ delivery_radius_km: Number(e.target.value) })}
              />
            </Field>

            <Field label="Min Order (₹)">
              <input
                type="number" min={0}
                className={IC}
                value={Number(form.min_order_amount ?? 0)}
                onChange={e => set({ min_order_amount: Number(e.target.value) })}
              />
            </Field>

            <Field label="Avg Prep Time (min)">
              <div className="relative">
                <ChefHat className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number" min={0}
                  className={cx(IC, 'pl-9')}
                  value={Number(form.estimated_prep_time ?? 30)}
                  onChange={e => set({ estimated_prep_time: Number(e.target.value) })}
                />
              </div>
            </Field>

            <Field label="Commission Rate (%)">
              <div className="relative">
                <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number" min={0} max={100} step={0.5}
                  className={cx(IC, 'pl-9')}
                  value={Number(form.commission_rate ?? 0)}
                  onChange={e => set({ commission_rate: Number(e.target.value) })}
                />
              </div>
            </Field>
          </div>
        </Section>

        {/* ── Operating Hours ──────────────────────────────────────────── */}
        <Section
          title="Operating Hours"
          icon={<Clock className="w-4 h-4 text-indigo-500" />}
          gradient="bg-gradient-to-br from-white to-indigo-50/40"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Opening Time" hint="When orders start being accepted">
              <input
                type="time"
                className={IC}
                value={form.opening_time || ''}
                onChange={e => set({ opening_time: e.target.value || null })}
              />
            </Field>

            <Field label="Closing Time" hint="When orders stop being accepted">
              <input
                type="time"
                className={IC}
                value={form.closing_time || ''}
                onChange={e => set({ closing_time: e.target.value || null })}
              />
            </Field>
          </div>

          {form.opening_time && form.closing_time && (
            <div className="mt-3 bg-white rounded-xl p-3 border text-sm">
              <span className="font-bold text-gray-900">
                {formatTimeDisplay(form.opening_time)}
              </span>
              <span className="text-gray-400 mx-2">→</span>
              <span className="font-bold text-gray-900">
                {formatTimeDisplay(form.closing_time)}
              </span>
              {isOvernightShift(form.opening_time, form.closing_time) && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                  🌙 Overnight
                </span>
              )}
            </div>
          )}

          {!form.opening_time && !form.closing_time && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-xs text-green-800">
                ✅ <strong>Always Open</strong> — Restaurant appears as open 24/7 to customers
              </p>
            </div>
          )}
        </Section>

        {/* ── GST ─────────────────────────────────────────────────────── */}
        <Section
          title="GST Settings"
          icon={<BadgePercent className="w-4 h-4 text-blue-500" />}
          gradient="bg-gradient-to-br from-white to-blue-50/40"
        >
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set({ gst_enabled: !form.gst_enabled })}
                className={cx(
                  'relative w-11 h-6 rounded-full transition-colors',
                  form.gst_enabled ? 'bg-primary' : 'bg-gray-200'
                )}
              >
                <span className={cx(
                  'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                  form.gst_enabled ? 'translate-x-5.5' : 'translate-x-0.5'
                )} />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                GST Enabled {form.gst_enabled && <span className="text-green-600">✓</span>}
              </span>
            </label>

            <div className="flex items-center gap-2 sm:ml-auto">
              <span className="text-sm font-semibold text-gray-600">Rate</span>
              <input
                type="number" min={0} max={28} step={0.5}
                disabled={!form.gst_enabled}
                className={cx(IC, 'w-24 text-center', !form.gst_enabled && 'opacity-40')}
                value={Number(form.gst_percentage ?? 0)}
                onChange={e => set({ gst_percentage: Number(e.target.value) })}
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
          </div>

          {form.gst_enabled && Number(form.gst_percentage) > 0 && (
            <div className="mt-3 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl p-2.5">
              GST of <strong>{form.gst_percentage}%</strong> will be applied to every order from this merchant.
            </div>
          )}
        </Section>

        {/* ── Status Flags ─────────────────────────────────────────────── */}
        <Section title="Status & Visibility" icon={<Building2 className="w-4 h-4 text-gray-500" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(
              [
                { key: 'is_active',   label: 'Active',   sub: 'Accepts orders',     color: 'green'  },
                { key: 'is_verified', label: 'Verified', sub: 'Shows verified badge', color: 'blue'   },
                { key: 'is_featured', label: 'Featured', sub: 'Shown in highlights', color: 'amber'  },
              ] as const
            ).map(({ key, label, sub, color }) => {
              const checked = !!form[key];
              const colorMap = {
                green: { bg: 'bg-green-50 border-green-300', dot: 'bg-green-500' },
                blue:  { bg: 'bg-blue-50 border-blue-300',   dot: 'bg-blue-500'  },
                amber: { bg: 'bg-amber-50 border-amber-300', dot: 'bg-amber-500' },
              };
              const c = colorMap[color];
              return (
                <label
                  key={key}
                  className={cx(
                    'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition select-none',
                    checked ? c.bg : 'bg-white border-gray-200 hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={e => set({ [key]: e.target.checked })}
                  />
                  <span className={cx(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    checked ? `${c.dot} border-transparent` : 'border-gray-300'
                  )}>
                    {checked && <span className="w-2 h-2 bg-white rounded-full" />}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    <p className="text-xs text-gray-500">{sub}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </Section>
      </div>

      {/* ── Location Modal ───────────────────────────────────────────────── */}
      {showLocationModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowLocationModal(false)}
          />
          <div className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-gray-900">Update Merchant Location</h3>
                <p className="text-xs text-gray-500">Search by address or pin on map</p>
              </div>
              <button
                type="button"
                className="p-2 rounded-xl hover:bg-gray-100 transition"
                onClick={() => setShowLocationModal(false)}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {/* Mode toggle */}
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1 mb-4">
                {(['search', 'map'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLocationMode(m)}
                    className={cx(
                      'flex-1 py-2 rounded-lg font-semibold text-sm transition',
                      locationMode === m ? 'bg-white text-primary shadow' : 'text-gray-500 hover:text-gray-800'
                    )}
                  >
                    {m === 'search' ? '🔍 Search Address' : '🗺️ Pick on Map'}
                  </button>
                ))}
              </div>

              {locationMode === 'search' ? (
                <div>
                  <p className="text-sm text-gray-500 mb-3">Type the address and select from suggestions.</p>
                  <AddressAutocomplete
                    onSelect={(loc: any) => {
                      set({
                        address: loc.address,
                        latitude: loc.lat,
                        longitude: loc.lon,
                        city: loc.city,
                        state: loc.state,
                        postal_code: loc.postalcode,
                      });
                      setShowLocationModal(false);
                    }}
                  />
                </div>
              ) : (
                <MapLocationPicker
                  initialLat={form.latitude}
                  initialLon={form.longitude}
                  onSelect={(loc: any) => {
                    set({
                      address: loc.address,
                      latitude: loc.lat,
                      longitude: loc.lon,
                      city: loc.city,
                      state: loc.state,
                      postal_code: loc.postalcode,
                    });
                    setShowLocationModal(false);
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
