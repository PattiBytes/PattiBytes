/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from 'react';
import { X, Send, Store, User } from 'lucide-react';
import { StarRating }  from './StarRating';
import type { Review, ReviewFormData, MerchantOption, CustomerOption } from '../_types';

interface Props {
  editTarget  ?: Review | null;
  merchants    : MerchantOption[];
  customers    : CustomerOption[];
  saving       : boolean;
  onSubmit     (form: ReviewFormData, notifyFollowers: boolean): void;
  onClose      (): void;
}

function buildForm(t?: Review | null): ReviewFormData {
  return {
    customer_id    : t?.customer_id      ?? '',
    merchant_id    : t?.merchant_id      ?? '',
    order_id       : t?.order_id         ?? null,
    rating         : Number(t?.overall_rating || t?.rating || 0),
    overall_rating : Number(t?.overall_rating || t?.rating || 0),
    food_rating    : Number(t?.food_rating    || 0),
    merchant_rating: Number(t?.merchant_rating|| 0),
    delivery_rating: Number(t?.delivery_rating|| 0),
    driver_rating  : Number(t?.driver_rating  || 0),
    comment        : t?.comment  ?? '',
    title          : t?.title    ?? '',
  };
}

export function ReviewForm({ editTarget, merchants, customers, saving, onSubmit, onClose }: Props) {
  const isEdit = !!editTarget;

  // ✅ KEY FIX: reset form whenever editTarget changes (new edit target or open-for-create)
  const [form, setForm] = useState<ReviewFormData>(() => buildForm(editTarget));
  useEffect(() => {
    setForm(buildForm(editTarget));
    // eslint-disable-next-line react-hooks/immutability
    setCustSearch(editTarget?.customerName ?? '');
    // eslint-disable-next-line react-hooks/immutability
    setMerchSearch(editTarget?.merchantName ?? '');
  }, [editTarget]);

  const [notify, setNotify]         = useState(!isEdit);
  const [custSearch, setCustSearch]   = useState(editTarget?.customerName ?? '');
  const [merchSearch, setMerchSearch] = useState(editTarget?.merchantName ?? '');

  const filteredCustomers = custSearch.length > 1
    ? customers.filter(c =>
        c.full_name?.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.phone?.includes(custSearch) ||
        c.email?.toLowerCase().includes(custSearch.toLowerCase())
      ).slice(0, 8)
    : [];

  const filteredMerchants = merchSearch.length > 1
    ? merchants.filter(m => m.business_name.toLowerCase().includes(merchSearch.toLowerCase())).slice(0, 6)
    : [];

  const set = (k: keyof ReviewFormData, v: any) =>
    setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_id) { alert('Select a customer'); return; }
    if (!form.merchant_id) { alert('Select a merchant'); return; }
    if ((form.rating ?? 0) < 1) { alert('Add at least 1 star overall rating'); return; }
    // ✅ Always send both rating fields so DB gets overall_rating regardless of column name
    onSubmit({ ...form, overall_rating: form.rating, rating: form.rating }, notify);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-gray-900">{isEdit ? 'Edit Review' : 'Add Review'}</h2>
            <p className="text-xs text-gray-400">
              {isEdit ? `Editing review by ${editTarget?.customerName ?? 'customer'}` : 'Post a review on behalf of a customer'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Customer picker */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
              <User size={10}/> Customer
            </label>
            {/* In edit mode: show locked customer badge */}
            {isEdit ? (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <User size={13} className="text-blue-400 shrink-0"/>
                <span className="text-sm font-semibold text-blue-800">
                  {editTarget?.customerName || form.customer_id.slice(0, 8)}
                </span>
                <span className="ml-auto text-xs text-blue-400 bg-blue-100 px-2 py-0.5 rounded-full">locked</span>
              </div>
            ) : form.customer_id ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-blue-800">
                  {customers.find(c => c.id === form.customer_id)?.full_name ?? form.customer_id.slice(0, 8)}
                </span>
                <button type="button" onClick={() => { set('customer_id', ''); setCustSearch(''); }}
                  className="text-blue-400 hover:text-blue-600"><X size={13}/></button>
              </div>
            ) : (
              <>
                <input value={custSearch} onChange={e => setCustSearch(e.target.value)}
                  placeholder="Search by name / phone / email…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"
                />
                {filteredCustomers.length > 0 && (
                  <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1 max-h-48 overflow-y-auto">
                    {filteredCustomers.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { set('customer_id', c.id); setCustSearch(c.full_name ?? c.phone ?? ''); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-orange-50 transition-colors">
                        <p className="font-semibold text-gray-800">{c.full_name ?? 'Unknown'}</p>
                        <p className="text-gray-400">{c.phone} · {c.email}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Merchant picker */}
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
              <Store size={10}/> Restaurant / Merchant
            </label>
            {isEdit ? (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <Store size={13} className="text-orange-400 shrink-0"/>
                <span className="text-sm font-semibold text-orange-800">
                  {editTarget?.merchantName || form.merchant_id.slice(0, 8)}
                </span>
                <span className="ml-auto text-xs text-orange-400 bg-orange-100 px-2 py-0.5 rounded-full">locked</span>
              </div>
            ) : form.merchant_id ? (
              <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-orange-800">
                  {merchants.find(m => m.id === form.merchant_id)?.business_name}
                </span>
                <button type="button" onClick={() => { set('merchant_id', ''); setMerchSearch(''); }}
                  className="text-orange-400 hover:text-orange-600"><X size={13}/></button>
              </div>
            ) : (
              <>
                <input value={merchSearch} onChange={e => setMerchSearch(e.target.value)}
                  placeholder="Search merchant name…"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary bg-white"
                />
                {filteredMerchants.length > 0 && (
                  <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-xl border border-gray-100 py-1">
                    {filteredMerchants.map(m => (
                      <button key={m.id} type="button"
                        onClick={() => { set('merchant_id', m.id); setMerchSearch(m.business_name); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-gray-700 transition-colors">
                        {m.business_name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Order ID */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Order ID (optional)</label>
            <input value={form.order_id ?? ''} onChange={e => set('order_id', e.target.value || null)}
              placeholder="Paste order UUID if linked to an order"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary font-mono"
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Review Title</label>
            <input value={form.title ?? ''} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Great food, fast delivery!"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Comment</label>
            <textarea value={form.comment ?? ''} onChange={e => set('comment', e.target.value)}
              rows={3} placeholder="Write the review text…"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Star ratings */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Ratings</label>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <StarRating label="Overall ★ (required)" value={form.rating}               onChange={v => set('rating', v)}           size={18} />
              <StarRating label="Food Quality"         value={form.food_rating    ?? 0}  onChange={v => set('food_rating', v)}      size={15} />
              <StarRating label="Service"              value={form.merchant_rating?? 0}  onChange={v => set('merchant_rating', v)}  size={15} />
              <StarRating label="Delivery"             value={form.delivery_rating?? 0}  onChange={v => set('delivery_rating', v)}  size={15} />
              <StarRating label="Driver"               value={form.driver_rating  ?? 0}  onChange={v => set('driver_rating', v)}    size={15} />
            </div>
          </div>

          {/* Notify toggle (add only) */}
          {!isEdit && (
            <label className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-100 cursor-pointer">
              <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)}
                className="w-4 h-4 accent-primary rounded" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Notify past customers</p>
                <p className="text-xs text-blue-500">Sends push notification to customers who ordered from this merchant</p>
              </div>
            </label>
          )}

          {/* Submit */}
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
            <Send size={14} />
            {saving ? 'Saving…' : isEdit ? 'Update Review' : 'Post Review'}
          </button>
        </form>
      </div>
    </div>
  );
}