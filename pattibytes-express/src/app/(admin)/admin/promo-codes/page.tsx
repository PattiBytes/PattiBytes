/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, RefreshCw, BadgePercent, Copy, Bell,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import DashboardLayout    from '@/components/layouts/DashboardLayout';
import { supabase }       from '@/lib/supabase';
import { useAuth }        from '@/contexts/AuthContext';
import { usePromoCodes }  from './_hooks/usePromoCodes';
import { PromoStats }     from './_components/PromoStats';
import { PromoCard }      from './_components/PromoCard';
import { PromoFilters }   from './_components/PromoFilters';
import { PromoFormModal } from './_components/PromoForm';
import { SecretManagerModal }  from './_components/SecretManagerModal';
import { NotifyPromoModal }    from './_components/NotifyPromoModal';
import type {
  PromoCodeRow, PromoFormState, MenuItemLite,
  BxgyTargetRow, PromoTargetRow,
  DealType, PromoScope,
} from './_types';

/* ─── helpers ───────────────────────────────────────────────────────────── */
function num(v: any, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function toIso(dateStr: string, endOfDay = false): string {
  if (!dateStr) return '';
  return endOfDay
    ? new Date(`${dateStr}T23:59:59.999`).toISOString()
    : new Date(`${dateStr}T00:00:00`).toISOString();
}

function buildPayload(
  form       : PromoFormState,
  merchantId : string | null,
  currentUser: string,
): Partial<PromoCodeRow> {
  const isBxgy = form.deal_type === 'bxgy';

  // ✅ Code is always resolved before buildPayload is called — but guard anyway
  const code = String(form.code ?? '').trim().toUpperCase() || (() => {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `AUTO-${rand}`;
  })();

  const deal_json = isBxgy ? {
    buy: { qty: form.bxgy_buy_qty },
    get: {
      qty     : form.bxgy_get_qty,
      discount: {
        type : form.bxgy_get_discount_type,
        value: form.bxgy_get_discount_type === 'free'
          ? 100
          : num(form.bxgy_get_discount_value),
      },
    },
    max_sets_per_order: form.bxgy_max_sets_per_order,
    selection         : form.bxgy_selection,
  } : null;

  return {
    code,                                                          // ✅ always a string
    description        : form.description || null,
    scope              : form.scope as PromoScope,
    merchant_id        : merchantId,
    deal_type          : form.deal_type as DealType,
    auto_apply         : form.auto_apply,
    priority           : num(form.priority),
    discount_type      : form.discount_type,
    discount_value     : isBxgy ? 0 : num(form.discount_value),
    min_order_amount   : form.min_order_amount    !== '' ? num(form.min_order_amount)    : null,
    max_discount_amount: form.max_discount_amount !== '' ? num(form.max_discount_amount) : null,
    usage_limit        : form.usage_limit         !== '' ? num(form.usage_limit)         : null,
    max_uses_per_user  : form.max_uses_per_user   !== '' ? num(form.max_uses_per_user)   : null,
    valid_from         : form.valid_from  ? toIso(form.valid_from)        : null,
    valid_until        : form.valid_until ? toIso(form.valid_until, true) : null,
    valid_days         : form.valid_days.length ? form.valid_days : null,
    start_time         : form.start_time || null,
    end_time           : form.end_time   || null,
    deal_json,
    is_secret            : form.is_secret,
    secret_allowed_users : form.is_secret ? form.secret_allowed_users : [],
    secret_note          : form.is_secret ? form.secret_note : null,
    created_by           : currentUser,
  };
}

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function ManagePromoCodesPage() {
  const { user } = useAuth();
  const role     = (user as any)?.role ?? 'admin';
  const isAdmin  = ['admin', 'superadmin'].includes(role);

  const {
    promos, merchants, customers, loading, saving,
    loadPromos, loadOptions,
    createPromo, updatePromo, deletePromo, toggleActive,
    replaceBxgyTargets, getBxgyTargets,
    replacePromoTargets, getPromoTargets, getMenuItemsByIds,
    notifyForPromo, assignSecretUsers,
  } = usePromoCodes();

  // ── Merchant ID for merchant-role users ──────────────────────────────────
  const [myMerchantId, setMyMerchantId] = useState('');
  useEffect(() => {
    if (isAdmin || !user?.id) return;
    supabase.from('merchants').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.id) setMyMerchantId(data.id); });
  }, [isAdmin, user?.id]);

  // ── Modal states ─────────────────────────────────────────────────────────
  const [showForm,     setShowForm]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<PromoCodeRow | null>(null);
  const [notifyTarget, setNotifyTarget] = useState<PromoCodeRow | null>(null);
  const [secretTarget, setSecretTarget] = useState<PromoCodeRow | null>(null);

  // Pre-loaded items for edit modal
  const [initTargets,  setInitTargets]  = useState<MenuItemLite[]>([]);
  const [initBuyItems, setInitBuyItems] = useState<MenuItemLite[]>([]);
  const [initGetItems, setInitGetItems] = useState<MenuItemLite[]>([]);

  // ── List filters ─────────────────────────────────────────────────────────
  const [query,          setQuery]          = useState('');
  const [showInactive,   setShowInactive]   = useState(true);
  const [typeFilter,     setTypeFilter]     = useState('all');
  const [merchantFilter, setMerchFilter]    = useState('');
  const [showFilters,    setShowFilters]    = useState(false);
  const [sortBy,         setSortBy]         = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [page,           setPage]           = useState(0);
  const PAGE_SIZE = 15;

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    const mid = !isAdmin ? myMerchantId : undefined;
    if (!isAdmin && !myMerchantId) return;
    void loadPromos(mid);
    void loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMerchantId]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...promos];

    if (!showInactive) list = list.filter(p => p.is_active);

    if (typeFilter !== 'all') {
      if (typeFilter === 'bxgy')         list = list.filter(p => p.deal_type === 'bxgy');
      else if (typeFilter === 'cart_discount') list = list.filter(p => (p.deal_type ?? 'cart_discount') !== 'bxgy');
      else if (typeFilter === 'secret')  list = list.filter(p => p.is_secret);
      else if (typeFilter === 'auto')    list = list.filter(p => p.auto_apply);
    }

    if (merchantFilter) list = list.filter(p => p.merchant_id === merchantFilter || p.scope === 'global');

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(p =>
        p.code.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'priority') return (num(b.priority) - num(a.priority)) || 0;
      if (sortBy === 'oldest')
        return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
    });

    return list;
  }, [promos, showInactive, typeFilter, merchantFilter, query, sortBy]);

  const paginated  = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [query, typeFilter, merchantFilter, showInactive, sortBy]);

  // ── Open edit modal with pre-loaded items ─────────────────────────────────
  const openEdit = useCallback(async (promo: PromoCodeRow) => {
    setInitTargets([]); setInitBuyItems([]); setInitGetItems([]);
    setEditTarget(promo);
    setShowForm(true);

    try {
      if (promo.deal_type === 'bxgy') {
        const targets: BxgyTargetRow[] = await getBxgyTargets(promo.id);
        const buyIds = targets.filter(t => t.side === 'buy').map(t => t.menu_item_id).filter(Boolean) as string[];
        const getIds = targets.filter(t => t.side === 'get').map(t => t.menu_item_id).filter(Boolean) as string[];
        const [buy, get] = await Promise.all([getMenuItemsByIds(buyIds), getMenuItemsByIds(getIds)]);
        setInitBuyItems(buy);
        setInitGetItems(get);
      } else if (promo.scope === 'targets') {
        const targets: PromoTargetRow[] = await getPromoTargets(promo.id);
        const ids = targets.map(t => t.menu_item_id).filter(Boolean) as string[];
        setInitTargets(await getMenuItemsByIds(ids));
      }
    } catch (e: any) {
      toast.error('Failed to load offer items: ' + (e?.message ?? ''));
    }
  }, [getBxgyTargets, getPromoTargets, getMenuItemsByIds]);

  // ── Submit handler (create + update) ─────────────────────────────────────
  const handleFormSubmit = useCallback(async (
    form    : PromoFormState,
    targets : MenuItemLite[],
    buy     : MenuItemLite[],
    get     : MenuItemLite[],
    notify  : boolean,
  ) => {
    if (!user?.id) return;

    const merchantId = isAdmin
      ? (form.scope === 'global' ? null : form.merchant_id || null)
      : (myMerchantId || null);

    const payload = buildPayload(form, merchantId, user.id);

    try {
      let saved: PromoCodeRow | null = null;

      if (editTarget) {
        saved = await updatePromo(editTarget.id, payload);
      } else {
        saved = await createPromo(payload);
      }

      if (!saved) return; // error already toasted inside hook

      // Persist BXGY / target rows
      if (form.deal_type === 'bxgy') {
        await replaceBxgyTargets(
          saved.id,
          buy.map(x => x.id),
          get.map(x => x.id),
        );
      } else if (form.scope === 'targets') {
        await replacePromoTargets(saved.id, merchantId, targets.map(x => x.id));
      }

      // Push notification
      if (notify) {
        await notifyForPromo(saved, editTarget ? 'activate' : 'create').catch(() => null);
      }

      setShowForm(false);
      setEditTarget(null);
      await loadPromos(!isAdmin ? myMerchantId : undefined);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save offer');
    }
  }, [
    user?.id, isAdmin, myMerchantId, editTarget,
    createPromo, updatePromo, replaceBxgyTargets,
    replacePromoTargets, notifyForPromo, loadPromos,
  ]);

  // ── Copy code to clipboard ────────────────────────────────────────────────
  const copyCode = useCallback(async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Copied "${code}" to clipboard`);
    } catch {
      toast.error('Could not copy');
    }
  }, []);

  // ── Secret assign save ────────────────────────────────────────────────────
  const handleSecretSave = useCallback(async (
    userIds: string[], notify: boolean, msg: string,
  ) => {
    if (!secretTarget) return;
    try {
      await assignSecretUsers(secretTarget.id, userIds, notify, msg);
      setSecretTarget(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed');
    }
  }, [secretTarget, assignSecretUsers]);

  // ── Merchant name helper ──────────────────────────────────────────────────
  const merchantName = useCallback((id: string | null) => {
    if (!id) return 'Global';
    return merchants.find(m => m.id === id)?.business_name ?? id.slice(0, 8);
  }, [merchants]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-3 sm:px-5 py-4 min-h-screen">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BadgePercent className="text-primary" size={20} />
              Promo Codes & Offers
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {promos.length} total · {promos.filter(p => p.is_active).length} active
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <button
              onClick={() => void loadPromos(!isAdmin ? myMerchantId : undefined)}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-all"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Sort toggle */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 font-semibold focus:ring-1 focus:ring-primary"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="priority">Priority</option>
            </select>

            <button
              onClick={() => setShowFilters(x => !x)}
              className={`flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                showFilters ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Filters {showFilters ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
            </button>

            <button
              onClick={() => { setEditTarget(null); setShowForm(true); setInitTargets([]); setInitBuyItems([]); setInitGetItems([]); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition-all shadow-sm"
            >
              <Plus size={12} /> New Offer
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <PromoStats promos={promos} />

        {/* ── Filters ── */}
        {showFilters && (
          <div className="animate-fade-in">
            <PromoFilters
              query={query}           setQuery={setQuery}
              showInactive={showInactive} setShowInactive={setShowInactive}
              typeFilter={typeFilter} setTypeFilter={setTypeFilter}
              merchantFilter={merchantFilter} setMerchFilter={setMerchFilter}
              merchants={merchants}   isAdmin={isAdmin}
            />
          </div>
        )}

        {/* ── Result count ── */}
        <p className="text-xs text-gray-400 mb-3">
          Showing {paginated.length} of {filtered.length} offers
          {typeFilter !== 'all' && ` · ${typeFilter}`}
          {merchantFilter && ` · ${merchantName(merchantFilter)}`}
        </p>

        {/* ── Promo list ── */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="text-center py-16">
            <BadgePercent size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No promo codes found</p>
            <p className="text-xs text-gray-400 mt-1">
              {query || typeFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first offer'}
            </p>
            <button
              onClick={() => { setEditTarget(null); setShowForm(true); }}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-all"
            >
              <Plus size={13} className="inline mr-1" /> Create Offer
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map(promo => (
              <PromoCard
                key={promo.id}
                promo={promo}
                merchantName={merchantName(promo.merchant_id)}
                onEdit   ={() => openEdit(promo)}
                onDelete ={() => deletePromo(promo)}
                onToggle ={() => toggleActive(promo)}
                onNotify ={() => setNotifyTarget(promo)}
                onCopy   ={copyCode}
                onSecretMgr={() => setSecretTarget(promo)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-all"
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i).map(i => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  page === i
                    ? 'bg-primary text-white shadow-sm'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100 transition-all"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Promo Form Modal ── */}
      {showForm && (
        <PromoFormModal
          editTarget   ={editTarget}
          merchants    ={merchants}
          customers    ={customers}
          saving       ={saving}
          isAdmin      ={isAdmin}
          defaultMerId ={myMerchantId}
          initTargets  ={initTargets}
          initBuyItems ={initBuyItems}
          initGetItems ={initGetItems}
          onSubmit     ={handleFormSubmit}
          onClose      ={() => { setShowForm(false); setEditTarget(null); }}
        />
      )}

      {/* ── Notify Modal ── */}
      {notifyTarget && (
        <NotifyPromoModal
          promo    ={notifyTarget}
          merchants={merchants}
          onSend   ={msg => {
            notifyForPromo(notifyTarget, 'activate', msg).catch(() => null);
            toast.success('Notification queued!');
          }}
          onClose  ={() => setNotifyTarget(null)}
        />
      )}

      {/* ── Secret Manager Modal ── */}
      {secretTarget && (
        <SecretManagerModal
          promo     ={secretTarget}
          customers ={customers}
          saving    ={saving}
          onSave    ={handleSecretSave}
          onClose   ={() => setSecretTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
