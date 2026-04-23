/* eslint-disable @typescript-eslint/no-unused-expressions */
'use client';
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Store, Search, CheckCircle2, XCircle, Clock,
  Star, ShoppingBag, Loader2, RefreshCw, Users,
  ChevronDown, ChevronUp, Award, Phone, Mail,
  MapPin, Percent, FileText, Building2, Timer,
  Truck, Receipt,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Toggle } from './Toggle';
import type { Merchant } from './types';
import { toast } from 'react-toastify';

export function MerchantControlSection() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading,   setLoading]   = useState<boolean>(true);
  const [saving,    setSaving]    = useState<Set<string>>(new Set());
  const [search,    setSearch]    = useState<string>('');
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [filter,    setFilter]    = useState<'all' | 'active' | 'inactive' | 'featured'>('all');
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());

  /* ── Load ── */
  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchants')
        .select('*')
        .order('business_name');
      if (error) throw error;
      setMerchants((data ?? []) as Merchant[]);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total:    merchants.length,
    active:   merchants.filter(m => m.is_active).length,
    inactive: merchants.filter(m => !m.is_active).length,
    featured: merchants.filter(m => m.is_featured).length,
    verified: merchants.filter(m => m.is_verified).length,
  }), [merchants]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = merchants;
    if (filter === 'active')   list = list.filter(m => m.is_active);
    if (filter === 'inactive') list = list.filter(m => !m.is_active);
    if (filter === 'featured') list = list.filter(m => m.is_featured);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(m =>
        m.business_name.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.includes(q) ||
        m.address?.toLowerCase().includes(q),
      );
    return list;
  }, [merchants, filter, search]);

  /* ── Single toggle ── */
  const toggleOne = async (id: string, value: boolean) => {
    setSaving(p => new Set(p).add(id));
    try {
      const { error } = await supabase.from('merchants').update({ is_active: value }).eq('id', id);
      if (error) throw error;
      setMerchants(p => p.map(m => m.id === id ? { ...m, is_active: value } : m));
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to update');
    } finally {
      setSaving(p => { const n = new Set(p); n.delete(id); return n; });
    }
  };

  const toggleFeatured = async (id: string, value: boolean) => {
    try {
      const { error } = await supabase.from('merchants').update({ is_featured: value }).eq('id', id);
      if (error) throw error;
      setMerchants(p => p.map(m => m.id === id ? { ...m, is_featured: value } : m));
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to update');
    }
  };

  const toggleVerified = async (id: string, value: boolean) => {
    try {
      const { error } = await supabase.from('merchants').update({ is_verified: value }).eq('id', id);
      if (error) throw error;
      setMerchants(p => p.map(m => m.id === id ? { ...m, is_verified: value } : m));
      toast.success(value ? '✅ Merchant verified' : 'Verification removed');
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to update');
    }
  };

  const patchField = async (id: string, patch: Partial<Merchant>) => {
    try {
      const { error } = await supabase.from('merchants').update(patch).eq('id', id);
      if (error) throw error;
      setMerchants(p => p.map(m => m.id === id ? { ...m, ...patch } : m));
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Failed to update');
    }
  };

  /* ── Bulk update ── */
  const bulkUpdate = async (ids: string[], patch: Partial<Merchant>) => {
    if (!ids.length) return;
    setSaving(new Set(ids));
    try {
      const { error } = await supabase.from('merchants').update(patch).in('id', ids);
      if (error) throw error;
      setMerchants(p => p.map(m => ids.includes(m.id) ? { ...m, ...patch } : m));
      toast.success(`Updated ${ids.length} merchant${ids.length > 1 ? 's' : ''}`);
      setSelected(new Set());
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? 'Bulk update failed');
    } finally {
      setSaving(new Set());
    }
  };

  /* ── Selection ── */
  const toggleSelect = (id: string) =>
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll   = () => setSelected(new Set(filtered.map(m => m.id)));
  const clearSelect = () => setSelected(new Set());
  const toggleExpand = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Render ── */
  return (
    <div className="space-y-5">

      {/* ── Stats (4 cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: stats.total,    icon: <Users        size={18} />, grad: 'from-blue-500 to-indigo-600',   bg: 'bg-blue-50   border-blue-200'   },
          { label: 'Open',     value: stats.active,   icon: <CheckCircle2 size={18} />, grad: 'from-green-500 to-emerald-600', bg: 'bg-green-50  border-green-200'  },
          { label: 'Closed',   value: stats.inactive, icon: <XCircle     size={18} />, grad: 'from-red-400 to-rose-600',      bg: 'bg-red-50    border-red-200'    },
          { label: 'Featured', value: stats.featured, icon: <Award        size={18} />, grad: 'from-yellow-400 to-orange-500', bg: 'bg-yellow-50 border-yellow-200' },
        ].map(s => (
          <div key={s.label}
            className={`${s.bg} rounded-2xl p-4 border-2 relative overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-default`}>
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${s.grad} opacity-15`} />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{s.label}</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1 tabular-nums">{s.value}</p>
            <div className={`absolute bottom-3 right-3 bg-gradient-to-br ${s.grad} text-white p-2 rounded-xl shadow-md`}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Verified strip */}
      <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
        <CheckCircle2 size={12} className="text-blue-500" />
        <span><strong className="text-blue-700">{stats.verified}</strong> verified merchant{stats.verified !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-orange-50 border-2 border-orange-300 rounded-2xl px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <span className="text-sm font-extrabold text-orange-800">{selected.size} selected</span>
          <button onClick={() => void bulkUpdate([...selected], { is_active: true })}
            className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-green-700 hover:scale-105 transition">
            <CheckCircle2 size={12} /> Open All
          </button>
          <button onClick={() => void bulkUpdate([...selected], { is_active: false })}
            className="px-3 py-2 rounded-xl bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-red-700 hover:scale-105 transition">
            <XCircle size={12} /> Close All
          </button>
          <button onClick={() => void bulkUpdate([...selected], { is_featured: true })}
            className="px-3 py-2 rounded-xl bg-yellow-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-yellow-600 hover:scale-105 transition">
            <Award size={12} /> Feature All
          </button>
          <button onClick={() => void bulkUpdate([...selected], { is_featured: false })}
            className="px-3 py-2 rounded-xl bg-gray-500 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-gray-600 hover:scale-105 transition">
            <Award size={12} /> Unfeature
          </button>
          <button onClick={() => void bulkUpdate([...selected], { is_verified: true })}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 hover:scale-105 transition">
            <CheckCircle2 size={12} /> Verify All
          </button>
          <button onClick={clearSelect} className="ml-auto text-xs text-gray-500 hover:text-gray-900 underline">Clear</button>
        </div>
      )}

      {/* ── Search + filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, city, email, phone…"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary text-sm transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}
              className="appearance-none pl-4 pr-9 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-primary cursor-pointer">
              <option value="all">All Merchants</option>
              <option value="active">Open Only</option>
              <option value="inactive">Closed Only</option>
              <option value="featured">Featured Only</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button onClick={() => void load()} disabled={loading} title="Refresh"
            className="p-3 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : 'text-gray-500'} />
          </button>
        </div>
      </div>

      {/* Select-all row */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span className="font-medium">{filtered.length} merchant{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={selected.size === filtered.length ? clearSelect : selectAll}
            className="font-bold text-primary hover:underline">
            {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* ── Merchant cards ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={36} className="animate-spin text-primary" />
          <p className="text-sm text-gray-500 font-medium">Loading merchants…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store size={48} className="mx-auto mb-3 text-gray-200" />
          <p className="font-bold text-gray-500">No merchants found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const isSaving   = saving.has(m.id);
            const isSelected = selected.has(m.id);
            const isExpanded = expanded.has(m.id);

            return (
              <div key={m.id}
                className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-xl
                  ${isSelected
                    ? 'border-primary shadow-md shadow-orange-100'
                    : m.is_active
                      ? 'border-gray-200 bg-white hover:border-gray-300'
                      : 'border-gray-100 bg-gray-50/50'
                  }`}>

                {/* ── Card header (clickable to select) ── */}
                <div
                  className={`relative p-4 cursor-pointer select-none transition-colors
                    ${isSelected ? 'bg-orange-50/60' : ''}`}
                  onClick={() => toggleSelect(m.id)}
                >
                  {/* Selection tick */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow z-10">
                      <CheckCircle2 size={12} className="text-white" />
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-yellow-50 border-2 border-white shadow-md flex-shrink-0">
                      {m.logo_url
                        ? <Image src={m.logo_url} alt={m.business_name} fill className="object-cover" />
                        : <Store size={24} className="absolute inset-0 m-auto text-orange-400" />}
                      <span className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white shadow
                        ${m.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {/* Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-gray-900 text-sm">{m.business_name}</h3>
                        {m.business_type && (
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold flex items-center gap-0.5 capitalize">
                            <Building2 size={9} /> {m.business_type}
                          </span>
                        )}
                        {m.is_featured && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-bold flex items-center gap-0.5">
                            <Award size={10} /> Featured
                          </span>
                        )}
                        {m.is_verified && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        )}
                        {m.gst_enabled && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center gap-0.5">
                            <Receipt size={9} /> GST {m.gst_percentage ?? 0}%
                          </span>
                        )}
                      </div>

                      {/* Location + cuisine */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin size={10} className="text-gray-400 shrink-0" />
                          {[m.city, m.state, m.postal_code].filter(Boolean).join(', ') || '—'}
                        </span>
                        {m.cuisine_types && m.cuisine_types.length > 0 && (
                          <span className="text-xs text-gray-400">• {m.cuisine_types.join(', ')}</span>
                        )}
                      </div>

                      {/* Stats row */}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                                              <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Star size={11} className="text-yellow-500 fill-yellow-400" />
                          {m.average_rating?.toFixed(1) ?? m.rating?.toFixed(1) ?? '—'}
                          {(m.total_reviews ?? 0) > 0 && (
                            <span className="text-gray-400">({m.total_reviews})</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <ShoppingBag size={11} /> {m.total_orders ?? 0} orders
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={11} /> {m.opening_time ?? '–'} – {m.closing_time ?? '–'}
                        </span>
                        {m.estimated_prep_time != null && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Timer size={11} /> {m.estimated_prep_time} min prep
                          </span>
                        )}
                        {(m.delivery_radius_km ?? m.delivery_radius) != null && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Truck size={11} /> {m.delivery_radius_km ?? m.delivery_radius} km
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Right controls ── */}
                    <div
                      className="flex flex-col items-end gap-3 flex-shrink-0 ml-2"
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Open / Close */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${m.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {m.is_active ? 'OPEN' : 'CLOSED'}
                        </span>
                        {isSaving
                          ? <Loader2 size={18} className="animate-spin text-primary" />
                          : <Toggle checked={m.is_active} onChange={v => void toggleOne(m.id, v)} />}
                      </div>

                      {/* Featured button */}
                      <button
                        onClick={() => void toggleFeatured(m.id, !m.is_featured)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition hover:scale-105
                          ${m.is_featured
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-yellow-50 hover:text-yellow-600'}`}>
                        <Award size={10} /> {m.is_featured ? 'Featured' : 'Feature'}
                      </button>

                      {/* Expand/collapse details */}
                      <button
                        onClick={() => toggleExpand(m.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 border-gray-200 hover:border-primary/40 hover:bg-orange-50 text-gray-500 transition">
                        {isExpanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> More</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Expanded detail panel ── */}
                {isExpanded && (
                  <div
                    className="border-t-2 border-dashed border-gray-100 px-4 py-5 bg-gray-50/60 space-y-5 animate-in slide-in-from-top-2 duration-200"
                    onClick={e => e.stopPropagation()}
                  >

                    {/* Contact info */}
                    <div>
                      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3">
                        Contact & Location
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {m.phone && (
                          <a href={`tel:${m.phone}`}
                            className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-orange-50 transition group">
                            <Phone size={13} className="text-primary shrink-0" />
                            <span className="text-sm text-gray-700 font-medium group-hover:text-primary">{m.phone}</span>
                          </a>
                        )}
                        {m.email && (
                          <a href={`mailto:${m.email}`}
                            className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-orange-50 transition group">
                            <Mail size={13} className="text-primary shrink-0" />
                            <span className="text-sm text-gray-700 font-medium truncate group-hover:text-primary">{m.email}</span>
                          </a>
                        )}
                        {m.address && (
                          <div className="flex items-start gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200 sm:col-span-2">
                            <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                            <span className="text-xs text-gray-600 leading-relaxed">{m.address}</span>
                          </div>
                        )}
                        {m.latitude != null && m.longitude != null && (
                          <a
                            href={`https://www.google.com/maps?q=${m.latitude},${m.longitude}`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200 hover:border-primary/40 transition text-xs font-semibold text-gray-500 hover:text-primary">
                            📍 {m.latitude.toFixed(5)}, {m.longitude.toFixed(5)} ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Business config */}
                    <div>
                      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3">
                        Business Configuration
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {[
                          { icon: <ShoppingBag size={13} />, label: 'Min Order',   value: m.min_order_amount != null ? `₹${m.min_order_amount}` : '—' },
                          { icon: <Timer       size={13} />, label: 'Prep Time',   value: m.estimated_prep_time != null ? `${m.estimated_prep_time} min` : '—' },
                          { icon: <Truck       size={13} />, label: 'Delivery R.', value: (m.delivery_radius_km ?? m.delivery_radius) != null ? `${m.delivery_radius_km ?? m.delivery_radius} km` : '—' },
                          { icon: <Clock       size={13} />, label: 'Avg Del.',    value: m.avg_delivery_time != null ? `${m.avg_delivery_time} min` : '—' },
                          { icon: <Percent     size={13} />, label: 'Commission',  value: m.commission_rate != null ? `${m.commission_rate}%` : '—' },
                          { icon: <Receipt     size={13} />, label: 'GST',         value: m.gst_enabled ? `${m.gst_percentage ?? 0}%` : 'Disabled' },
                          { icon: <FileText    size={13} />, label: 'Reviews',     value: String(m.total_reviews ?? 0) },
                          { icon: <Star        size={13} />, label: 'Rating',      value: m.average_rating?.toFixed(2) ?? m.rating?.toFixed(2) ?? '—' },
                        ].map(item => (
                          <div key={item.label}
                            className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-gray-200">
                            <span className="text-primary shrink-0">{item.icon}</span>
                            <div className="min-w-0">
                              <p className="text-[10px] text-gray-400 font-semibold leading-none">{item.label}</p>
                              <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{item.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    {m.description && (
                      <div>
                        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                          Description
                        </p>
                        <p className="text-sm text-gray-600 leading-relaxed bg-white rounded-xl px-4 py-3 border border-gray-200">
                          {m.description}
                        </p>
                      </div>
                    )}

                    {/* Banner image */}
                    {m.banner_url && (
                      <div>
                        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                          Banner
                        </p>
                        <div className="relative h-28 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                          <Image src={m.banner_url} alt="banner" fill className="object-cover" />
                        </div>
                      </div>
                    )}

                    {/* Inline editable fields */}
                    <div>
                      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3">
                        Quick Edit
                      </p>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">

                        {/* Opening time */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Opening Time</label>
                          <input
                            type="time"
                            defaultValue={m.opening_time ?? ''}
                            onBlur={e => void patchField(m.id, { opening_time: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>

                        {/* Closing time */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Closing Time</label>
                          <input
                            type="time"
                            defaultValue={m.closing_time ?? ''}
                            onBlur={e => void patchField(m.id, { closing_time: e.target.value })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>

                        {/* Min order amount */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Min Order (₹)</label>
                          <input
                            type="number"
                            min={0}
                            defaultValue={m.min_order_amount ?? 0}
                            onBlur={e => void patchField(m.id, { min_order_amount: Number(e.target.value) })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>

                        {/* Prep time */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Prep Time (min)</label>
                          <input
                            type="number"
                            min={0}
                            defaultValue={m.estimated_prep_time ?? 30}
                            onBlur={e => void patchField(m.id, { estimated_prep_time: Number(e.target.value) })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>

                        {/* Commission rate */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Commission (%)</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            defaultValue={m.commission_rate ?? 10}
                            onBlur={e => void patchField(m.id, { commission_rate: Number(e.target.value) })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>

                        {/* Delivery radius */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1.5">Delivery Radius (km)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            defaultValue={m.delivery_radius_km ?? m.delivery_radius ?? 5}
                            onBlur={e => void patchField(m.id, {
                              delivery_radius_km: Number(e.target.value),
                              delivery_radius:    Number(e.target.value),
                            })}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary transition-all"
                          />
                        </div>

                        {/* GST toggle + percentage */}
                        <div className="flex items-center gap-3 bg-white rounded-xl border-2 border-gray-200 px-3 py-2.5">
                          <Toggle
                            checked={m.gst_enabled ?? false}
                            onChange={v => void patchField(m.id, { gst_enabled: v })}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-700">GST Enabled</p>
                            {m.gst_enabled && (
                              <input
                                type="number"
                                min={0}
                                max={28}
                                step={0.5}
                                defaultValue={m.gst_percentage ?? 5}
                                onBlur={e => void patchField(m.id, { gst_percentage: Number(e.target.value) })}
                                placeholder="GST %"
                                className="mt-1 w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-primary"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Verify / Unverify action */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className={m.is_verified ? 'text-blue-500' : 'text-gray-300'} />
                        <span className="text-xs font-bold text-gray-700">
                          {m.is_verified ? 'Merchant is verified' : 'Not yet verified'}
                        </span>
                      </div>
                      <button
                        onClick={() => void toggleVerified(m.id, !m.is_verified)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition hover:scale-105
                          ${m.is_verified
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-blue-300 bg-blue-600 text-white hover:bg-blue-700 shadow-md'}`}>
                        {m.is_verified ? 'Revoke Verification' : '✓ Mark as Verified'}
                      </button>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
