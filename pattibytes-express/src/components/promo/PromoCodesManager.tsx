/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  Copy,
  Edit,
  LogOut,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  Sparkles,
  BadgePercent,
  Gift,
  Search,
  X,
  ChevronDown,
  Leaf,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

import {
  promoCodeService,
  PromoCodeRow,
  PromoScope,
  DiscountType,
  MenuItemLite,
  MerchantLite,
  DealType,
} from '@/services/promoCodes';

const DAYS: { n: number; label: string }[] = [
  { n: 1, label: 'Mon' },
  { n: 2, label: 'Tue' },
  { n: 3, label: 'Wed' },
  { n: 4, label: 'Thu' },
  { n: 5, label: 'Fri' },
  { n: 6, label: 'Sat' },
  { n: 7, label: 'Sun' },
];

function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return '';
  const s = String(iso);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

function startOfDayIso(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
}

function endOfDayIso(dateStr: string) {
  const d = new Date(`${dateStr}T23:59:59.999`);
  return d.toISOString();
}

function formatDateOrDash(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN');
}

function formatDays(days: number[] | null) {
  if (!days || days.length === 0) return '—';
  const map = new Map(DAYS.map((d) => [d.n, d.label]));
  return days.map((n) => map.get(n) ?? String(n)).join(', ');
}

type Mode = 'admin' | 'merchant';
type MenuPickSide = 'targets' | 'bxgy_buy' | 'bxgy_get';
const SIDE_TARGETS: MenuPickSide = 'targets';
const SIDE_BUY: MenuPickSide = 'bxgy_buy';
const SIDE_GET: MenuPickSide = 'bxgy_get';

type MenuSortKey = 'recommended' | 'price_low' | 'price_high';

function clampNum(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(' ');
}

function Pill({
  children,
  tone = 'gray',
}: {
  children: ReactNode;
  tone?: 'gray' | 'green' | 'blue' | 'purple' | 'yellow' | 'red' | 'orange';
}) {
  const map: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-800',
    green: 'bg-green-100 text-green-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
  };
  return <span className={cx('px-3 py-1 rounded-full text-xs font-bold', map[tone])}>{children}</span>;
}

function Chip({ it, onRemove }: { it: MenuItemLite; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold">
      <span className="truncate max-w-[220px]">{it.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className="w-6 h-6 rounded-lg bg-white border hover:bg-red-50 hover:border-red-200 text-gray-600 hover:text-red-600"
        title="Remove"
      >
        ×
      </button>
    </span>
  );
}

/** Smart “nearest” ranking (client-side) */
function scoreMatch(name: string, desc: string | null | undefined, q: string) {
  const n = String(name || '').toLowerCase().trim();
  const d = String(desc || '').toLowerCase().trim();
  const s = String(q || '').toLowerCase().trim();
  if (!s) return 0;

  if (n === s) return 1000;
  if (n.startsWith(s)) return 850;
  if (n.includes(s)) return 600;

  const tokens = s.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const t of tokens) {
    if (n.includes(t)) hits += 3;
    else if (d.includes(t)) hits += 1;
  }
  return hits * 120;
}

export default function PromoCodesManager({ mode }: { mode: Mode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const isAdmin = user?.role === 'superadmin';
  const isMerchant = user?.role === 'merchant';

  const [loading, setLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCodeRow[]>([]);

  // Admin merchant filter + merchant list
  const [merchants, setMerchants] = useState<MerchantLite[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeRow | null>(null);

  // List UI extras
  const [listQuery, setListQuery] = useState('');
  const [showInactive, setShowInactive] = useState(true);

  // Cart-discount targets
  const [selectedMenuItems, setSelectedMenuItems] = useState<MenuItemLite[]>([]);

  // BXGY targets
  const [bxgyBuyItems, setBxgyBuyItems] = useState<MenuItemLite[]>([]);
  const [bxgyGetItems, setBxgyGetItems] = useState<MenuItemLite[]>([]);

  // Menu picker (grid)
  const [pickingSide, setPickingSide] = useState<MenuPickSide>(SIDE_TARGETS);
  const [menuPanelOpen, setMenuPanelOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuVegOnly, setMenuVegOnly] = useState(false);
  const [menuSortKey, setMenuSortKey] = useState<MenuSortKey>('recommended');
  const [menuVisibleCount, setMenuVisibleCount] = useState(48);
  const menuInputRef = useRef<HTMLInputElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const [menuAllItems, setMenuAllItems] = useState<MenuItemLite[]>([]);
const [merchantIdResolved, setMerchantIdResolved] = useState<string | null>(null);

useEffect(() => {
  if (mode !== 'merchant') return;
  const uid = user?.id;
  if (!uid) return;

  (async () => {
    const mid = await promoCodeService.getMerchantIdByUserId(uid);
    setMerchantIdResolved(mid);
  })();
}, [mode, user?.id]);

  const [form, setForm] = useState({
    // Universal
    code: '',
    description: '',
    scope: (mode === 'merchant' ? 'merchant' : 'global') as PromoScope,
    merchant_id: '',

    deal_type: 'cart_discount' as DealType,
    auto_apply: false,
    priority: 0,

    // Cart discount
    discount_type: 'percentage' as DiscountType,
    discount_value: '' as string | number,
    min_order_amount: '' as string | number,
    max_discount_amount: '' as string | number,
    usage_limit: '' as string | number,
    max_uses_per_user: '' as string | number,

    // Timing
    valid_from: '' as string,
    valid_until: '' as string,
    valid_days: [] as number[],
    start_time: '' as string,
    end_time: '' as string,

    // BXGY
    bxgy_buy_qty: 1,
    bxgy_get_qty: 1,
    bxgy_get_discount_type: 'free' as 'free' | 'percentage' | 'fixed',
    bxgy_get_discount_value: '' as string | number,
    bxgy_max_sets_per_order: 1,
    bxgy_selection: 'auto_cheapest' as 'auto_cheapest' | 'customer_choice',
  });

  const showMerchantSelect = mode === 'admin' && form.scope !== 'global';

  // ONLY merchant used for menu picking (prevents wrong-merchant menu in modal)
 const merchantForPicker = useMemo(() => {
  if (mode === 'merchant') return merchantIdResolved ? String(merchantIdResolved) : '';
  if (form.scope === 'global') return '';
  return String(form.merchant_id || '').trim();
}, [mode, merchantIdResolved, form.scope, form.merchant_id]);


  const merchantIdToSave = useMemo(() => {
  const scope = form.scope as PromoScope;
  if (scope === 'global') return null;
  if (mode === 'merchant') return merchantIdResolved ?? null;
  return form.merchant_id ? form.merchant_id : null;
}, [form.scope, form.merchant_id, mode, merchantIdResolved]);

  const menuCacheRef = useRef(new Map<string, { ts: number; items: MenuItemLite[] }>());
  const MENU_CACHE_TTL = 5 * 60 * 1000;

 const ensureMerchantMenuLoaded = async () => {
  if (!merchantForPicker) {
    setMenuAllItems([]);
    return;
  }

  const cached = menuCacheRef.current.get(merchantForPicker);
  const fresh = cached && Date.now() - cached.ts < MENU_CACHE_TTL;

  if (fresh) {
    setMenuAllItems(cached?.items ?? []);
    return;
  }

  const items = await promoCodeService.listAllMenuItems({
    merchantId: merchantForPicker,
    includeUnavailable: true,
    pageSize: 500,
    hardLimit: 20000,
  });

  menuCacheRef.current.set(merchantForPicker, { ts: Date.now(), items });
  setMenuAllItems(items);
};

const [menuLoading, setMenuLoading] = useState(false);
const [menuLoadError, setMenuLoadError] = useState<string>('');

  const openMenuPicker = async (side: MenuPickSide) => {
  if (!merchantForPicker) {
    toast.error('Please select a merchant/restaurant first');
    return;
  }

  setPickingSide(side);
  setMenuPanelOpen(true);
  setMenuSearch('');
  setMenuVegOnly(false);
  setMenuSortKey('recommended');
  setMenuVisibleCount(48);

  setMenuLoadError('');
  setMenuLoading(true);
  try {
    await ensureMerchantMenuLoaded();
  } catch (e: any) {
    console.error(e);
    const msg = e?.message || 'Failed to load menu';
    setMenuLoadError(msg);
    toast.error(msg);
    setMenuAllItems([]);
  } finally {
    setMenuLoading(false);
  }

  requestAnimationFrame(() => {
    pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    menuInputRef.current?.focus();
  });
};

  const closeMenuPicker = () => {
    setMenuPanelOpen(false);
    setMenuSearch('');
  };

  useEffect(() => {
    // if merchant changes while modal is open, reset menu panel state
    setMenuSearch('');
    setMenuVisibleCount(48);
    setMenuAllItems([]);
    if (!menuPanelOpen) return;
    ensureMerchantMenuLoaded().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantForPicker]);

  useEffect(() => {
    // Reset visible count when filters change (keeps UI snappy)
    setMenuVisibleCount(48);
  }, [menuSearch, menuVegOnly, menuSortKey]);

  const isSelected = (id: string, side: MenuPickSide) => {
    if (side === SIDE_TARGETS) return selectedMenuItems.some((x) => x.id === id);
    if (side === SIDE_BUY) return bxgyBuyItems.some((x) => x.id === id);
    return bxgyGetItems.some((x) => x.id === id);
  };

  const togglePick = (it: MenuItemLite) => {
    const side = pickingSide;

    if (side === SIDE_TARGETS) {
      setSelectedMenuItems((prev) => (prev.some((x) => x.id === it.id) ? prev.filter((x) => x.id !== it.id) : [...prev, it]));
      return;
    }

    if (side === SIDE_BUY) {
      setBxgyBuyItems((prev) => (prev.some((x) => x.id === it.id) ? prev.filter((x) => x.id !== it.id) : [...prev, it]));
      return;
    }

    setBxgyGetItems((prev) => (prev.some((x) => x.id === it.id) ? prev.filter((x) => x.id !== it.id) : [...prev, it]));
  };

  const removePickedItem = (id: string, side: MenuPickSide) => {
    if (side === SIDE_TARGETS) setSelectedMenuItems((prev) => prev.filter((x) => x.id !== id));
    if (side === SIDE_BUY) setBxgyBuyItems((prev) => prev.filter((x) => x.id !== id));
    if (side === SIDE_GET) setBxgyGetItems((prev) => prev.filter((x) => x.id !== id));
  };

  const flatMenuFiltered = useMemo(() => {
    let list = menuAllItems;

    if (menuVegOnly) list = list.filter((it) => it.is_veg === true);

    const q = menuSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((it) => {
        const hay =
          `${it.name || ''} ${it.description || ''} ${(it as any).category || ''} ${it.category_id || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }

    if (menuSortKey === 'price_low') {
      list = [...list].sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (menuSortKey === 'price_high') {
      list = [...list].sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else {
      // recommended: if searching, rank by match; else sort by name
      if (q) {
        list = [...list].sort((a, b) => scoreMatch(b.name, b.description, q) - scoreMatch(a.name, a.description, q));
      } else {
        list = [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      }
    }

    return list;
  }, [menuAllItems, menuSearch, menuVegOnly, menuSortKey]);

  const menuGridItems = useMemo(() => flatMenuFiltered.slice(0, menuVisibleCount), [flatMenuFiltered, menuVisibleCount]);

  const stats = useMemo(() => {
    const active = promoCodes.filter((p) => p.is_active).length;
    return { total: promoCodes.length, active };
  }, [promoCodes]);

  const filteredList = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return promoCodes
      .filter((p) => (showInactive ? true : p.is_active))
      .filter((p) => {
        if (!q) return true;
        const s = `${p.code} ${p.description ?? ''} ${(p.deal_type ?? 'cart_discount')}`.toLowerCase();
        return s.includes(q);
      })
      .sort((a, b) => clampNum((b as any).priority, 0) - clampNum((a as any).priority, 0));
  }, [promoCodes, listQuery, showInactive]);

  const offerPreview = useMemo(() => {
    if (form.deal_type === 'bxgy') {
      const buy = clampNum(form.bxgy_buy_qty, 1);
      const get = clampNum(form.bxgy_get_qty, 1);
      const dt = form.bxgy_get_discount_type;
      const dv = clampNum(form.bxgy_get_discount_value, 0);
      const disc = dt === 'free' ? 'Free' : dt === 'percentage' ? `${dv}% off` : `₹${dv} off`;
      return `Buy ${buy} Get ${get} (${disc})`;
    }
    const dv = clampNum(form.discount_value, 0);
    return form.discount_type === 'percentage' ? `${dv}% off` : `₹${dv} off`;
  }, [form]);

  useEffect(() => {
    if (mode === 'admin' && !isAdmin) return;
    if (mode === 'merchant' && !isMerchant) return;

    (async () => {
      try {
        if (mode === 'admin') {
          const ms = await promoCodeService.listMerchants();
          setMerchants(ms);
        }
      } catch (e: any) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user?.role]);

  useEffect(() => {
    if (mode === 'admin' && !isAdmin) return;
    if (mode === 'merchant' && !isMerchant) return;
    loadPromoCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedMerchantId, user?.id, user?.role]);

  const loadPromoCodes = async () => {
    try {
      setLoading(true);

     if (mode === 'merchant') {
  const mid = merchantIdResolved;
  if (!mid) return;
  const rows = await promoCodeService.listPromoCodes({ merchantId: mid, includeGlobal: false });
  setPromoCodes(rows);
      } else {
        if (selectedMerchantId) {
          const rows = await promoCodeService.listPromoCodes({ merchantId: selectedMerchantId, includeGlobal: true });
          setPromoCodes(rows);
        } else {
        const rows = await promoCodeService.listPromoCodes({ merchantId: null, includeGlobal: true });
setPromoCodes(rows);

        }
      }
    } catch (error: any) {
      console.error('Failed to load promo codes:', error);
      toast.error(error?.message || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const resetForm = () => {
    setEditingPromo(null);
    setSelectedMenuItems([]);
    setBxgyBuyItems([]);
    setBxgyGetItems([]);

    setPickingSide(SIDE_TARGETS);
    setMenuPanelOpen(false);
    setMenuSearch('');
    setMenuVegOnly(false);
    setMenuSortKey('recommended');
    setMenuVisibleCount(48);
    setMenuAllItems([]);

    setForm({
      code: '',
      description: '',
      scope: mode === 'merchant' ? 'merchant' : 'global',
      merchant_id: '',

      deal_type: 'cart_discount',
      auto_apply: false,
      priority: 0,

      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '',
      max_discount_amount: '',
      usage_limit: '',
      max_uses_per_user: '',

      valid_from: '',
      valid_until: '',
      valid_days: [],
      start_time: '',
      end_time: '',

      bxgy_buy_qty: 1,
      bxgy_get_qty: 1,
      bxgy_get_discount_type: 'free',
      bxgy_get_discount_value: '',
      bxgy_max_sets_per_order: 1,
      bxgy_selection: 'auto_cheapest',
    });
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);

    if (mode === 'merchant') {
      setForm((p) => ({ ...p, scope: 'merchant' }));
    } else {
      if (selectedMerchantId) setForm((p) => ({ ...p, merchant_id: selectedMerchantId }));
    }
  };

  const openEdit = async (promo: PromoCodeRow) => {
    setEditingPromo(promo);
    setShowModal(true);

    setMenuPanelOpen(false);
    setMenuSearch('');
    setMenuVegOnly(false);
    setMenuSortKey('recommended');
    setMenuVisibleCount(48);
    setMenuAllItems([]);

    const dealType = (promo.deal_type as DealType) || 'cart_discount';
    const deal = (promo.deal_json as any) || {};

    setForm({
      code: promo.code ?? '',
      description: promo.description ?? '',
      scope: (promo.scope ?? (promo.merchant_id ? 'merchant' : 'global')) as PromoScope,
      merchant_id: promo.merchant_id ?? '',

      deal_type: dealType,
      auto_apply: !!(promo as any).auto_apply,
      priority: clampNum((promo as any).priority, 0),

      discount_type: promo.discount_type,
      discount_value: promo.discount_value ?? '',

      min_order_amount: promo.min_order_amount ?? '',
      max_discount_amount: promo.max_discount_amount ?? '',
      usage_limit: promo.usage_limit ?? '',
      max_uses_per_user: promo.max_uses_per_user ?? '',

      valid_from: toDateInputValue(promo.valid_from),
      valid_until: toDateInputValue(promo.valid_until),
      valid_days: (promo.valid_days ?? []) as number[],
      start_time: promo.start_time ? String(promo.start_time).slice(0, 5) : '',
      end_time: promo.end_time ? String(promo.end_time).slice(0, 5) : '',

      bxgy_buy_qty: clampNum(deal?.buy?.qty, 1),
      bxgy_get_qty: clampNum(deal?.get?.qty, 1),
      bxgy_get_discount_type: (deal?.get?.discount?.type as any) || 'free',
      bxgy_get_discount_value: deal?.get?.discount?.value ?? '',
      bxgy_max_sets_per_order: clampNum(deal?.max_sets_per_order, 1),
      bxgy_selection: (deal?.selection as any) || 'auto_cheapest',
    });

    // Targets (scope=targets)
    if (promo.scope === 'targets') {
      try {
        const targets = await promoCodeService.getPromoTargets(promo.id);
        const menuIds = targets.map((t) => t.menu_item_id).filter(Boolean) as string[];
        const items = await promoCodeService.getMenuItemsByIds(menuIds);
        setSelectedMenuItems(items);
      } catch (e: any) {
        console.error(e);
        toast.error('Failed to load promo targets');
      }
    } else {
      setSelectedMenuItems([]);
    }

    // BXGY targets
    if (dealType === 'bxgy') {
      try {
        const bx = await promoCodeService.getBxgyTargets(promo.id);
        const buyIds = bx.filter((x: any) => x.side === 'buy').map((x: any) => x.menu_item_id);
        const getIds = bx.filter((x: any) => x.side === 'get').map((x: any) => x.menu_item_id);
        const allIds = Array.from(new Set([...buyIds, ...getIds]));
        const allItems = await promoCodeService.getMenuItemsByIds(allIds);

        const map = new Map(allItems.map((it) => [it.id, it]));
        setBxgyBuyItems(buyIds.map((id: string) => map.get(id)).filter(Boolean) as MenuItemLite[]);
        setBxgyGetItems(getIds.map((id: string) => map.get(id)).filter(Boolean) as MenuItemLite[]);
      } catch (e: any) {
        console.error(e);
        toast.error('Failed to load BXGY targets');
      }
    } else {
      setBxgyBuyItems([]);
      setBxgyGetItems([]);
    }
  };

  const onToggleDay = (n: number) => {
    setForm((p) => {
      const has = p.valid_days.includes(n);
      const next = has ? p.valid_days.filter((x) => x !== n) : [...p.valid_days, n];
      next.sort((a, b) => a - b);
      return { ...p, valid_days: next };
    });
  };

  const handleToggleActive = async (promo: PromoCodeRow) => {
    try {
      const next = !promo.is_active;
      await promoCodeService.toggleActive(promo.id, next);
      toast.success(`Offer ${next ? 'activated' : 'deactivated'}!`);
      loadPromoCodes();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update');
    }
  };

  const handleDelete = async (promo: PromoCodeRow) => {
    if (!confirm(`Delete "${promo.code}"?`)) return;
    try {
      await promoCodeService.deletePromoCode(promo.id);
      toast.success('Deleted');
      loadPromoCodes();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to delete');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const scope: PromoScope = form.scope;

    if (form.deal_type === 'bxgy' && scope === 'global') {
      return toast.error('BXGY offers must be merchant-scoped (select a merchant).');
    }

    if (scope === 'global' && mode !== 'admin') return toast.error('Only admin can create global promos');
    if (scope !== 'global' && !merchantIdToSave) return toast.error('Please select a merchant/restaurant');

    let code = String(form.code || '').trim().toUpperCase();
    if (!code) {
      if (form.auto_apply) code = `AUTO-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      else return toast.error('Promo code is required');
    }

    if (form.deal_type === 'cart_discount') {
      const discountValue = clampNum(form.discount_value, 0);
      if (discountValue <= 0) return toast.error('Discount value must be > 0');
    } else {
      const buyQ = clampNum(form.bxgy_buy_qty, 0);
      const getQ = clampNum(form.bxgy_get_qty, 0);
      if (buyQ <= 0 || getQ <= 0) return toast.error('Buy/Get qty must be > 0');

      if (bxgyBuyItems.length === 0) return toast.error('Select at least 1 Buy item');
      if (bxgyGetItems.length === 0) return toast.error('Select at least 1 Get item');

      if (form.bxgy_get_discount_type !== 'free') {
        const v = clampNum(form.bxgy_get_discount_value, 0);
        if (v <= 0) return toast.error('Get discount value must be > 0');
      }
    }

    if (form.deal_type === 'cart_discount' && scope === 'targets' && selectedMenuItems.length === 0) {
      return toast.error('Please add at least 1 menu item target');
    }

    const nowIso = new Date().toISOString();

    const deal_json =
      form.deal_type === 'bxgy'
        ? {
            buy: { qty: clampNum(form.bxgy_buy_qty, 1) },
            get: {
              qty: clampNum(form.bxgy_get_qty, 1),
              discount: {
                type: form.bxgy_get_discount_type,
                value: form.bxgy_get_discount_type === 'free' ? 100 : clampNum(form.bxgy_get_discount_value, 0),
              },
            },
            selection: form.bxgy_selection,
            max_sets_per_order: clampNum(form.bxgy_max_sets_per_order, 1),
          }
        : null;

    const payload: Partial<PromoCodeRow> = {
      code,
      description: String(form.description || '').trim() || null,

      discount_type: form.discount_type,
      discount_value: form.deal_type === 'cart_discount' ? clampNum(form.discount_value, 0) : 0,

      min_order_amount: form.min_order_amount === '' ? null : clampNum(form.min_order_amount, 0),
      max_discount_amount: form.max_discount_amount === '' ? null : clampNum(form.max_discount_amount, 0),

      usage_limit: form.usage_limit === '' ? null : clampNum(form.usage_limit, 0),
      max_uses_per_user: form.max_uses_per_user === '' ? null : clampNum(form.max_uses_per_user, 0),

      valid_from: form.valid_from ? startOfDayIso(form.valid_from) : null,
      valid_until: form.valid_until ? endOfDayIso(form.valid_until) : null,

      valid_days: form.valid_days.length > 0 ? form.valid_days : null,
      start_time: form.start_time ? `${form.start_time}:00` : null,
      end_time: form.end_time ? `${form.end_time}:00` : null,

      scope,
      merchant_id: scope === 'global' ? null : merchantIdToSave,

      updated_at: nowIso,
      created_by: (editingPromo?.created_by ?? user?.id ?? null) as any,

      deal_type: form.deal_type,
      deal_json,
      auto_apply: !!form.auto_apply,
      priority: clampNum(form.priority, 0),
    };

    try {
      setLoading(true);

      let saved: PromoCodeRow;
      if (editingPromo) {
        saved = await promoCodeService.updatePromoCode(editingPromo.id, payload);
      } else {
        saved = await promoCodeService.createPromoCode({
          ...payload,
          created_at: nowIso,
          is_active: true,
          used_count: 0,
        } as any);
      }

      if (form.deal_type === 'cart_discount') {
        const merchantIdForSave = scope === 'global' ? null : merchantIdToSave;

        if (scope === 'targets') {
          await promoCodeService.replacePromoTargets({
            promoCodeId: saved.id,
            merchantId: merchantIdForSave,
            menuItemIds: selectedMenuItems.map((x) => x.id),
          });
        } else if (editingPromo) {
          await promoCodeService.replacePromoTargets({
            promoCodeId: saved.id,
            merchantId: merchantIdForSave,
            menuItemIds: [],
          });
        }
      }

      if (form.deal_type === 'bxgy') {
        await promoCodeService.replaceBxgyTargets({
          promoCodeId: saved.id,
          merchantId: scope === 'global' ? null : merchantIdToSave,
          buyMenuItemIds: bxgyBuyItems.map((x) => x.id),
          getMenuItemIds: bxgyGetItems.map((x) => x.id),
        });
      }

      toast.success(editingPromo ? 'Offer updated!' : 'Offer created!');
      setShowModal(false);
      resetForm();
      loadPromoCodes();
    } catch (error: any) {
      console.error('Failed to save:', error);
      toast.error(error?.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'admin' && !isAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="text-gray-600 mt-1">Admin only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (mode === 'merchant' && !isMerchant) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white border rounded-2xl p-6">
            <h2 className="text-xl font-bold">Access denied</h2>
            <p className="text-gray-600 mt-1">Merchant only.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white border rounded-2xl p-4 sm:p-5 mb-5">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Offers & Promo Codes {mode === 'admin' ? '(Admin)' : '(Merchant)'}
                </h1>
                <Pill tone="blue">{stats.total} total</Pill>
                <Pill tone="green">{stats.active} active</Pill>
              </div>

              <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    value={listQuery}
                    onChange={(e) => setListQuery(e.target.value)}
                    placeholder="Search offers by code / description / type…"
                    className="w-full pl-9 pr-10 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-primary"
                  />
                  {listQuery && (
                    <button
                      type="button"
                      onClick={() => setListQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900"
                      title="Clear"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <label className="inline-flex items-center gap-2 px-3 py-2.5 border rounded-xl bg-white text-sm font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Show inactive
                </label>
              </div>

              {mode === 'admin' && (
                <div className="mt-3 flex gap-2 flex-wrap items-center">
                  <label className="text-sm font-semibold text-gray-700">Filter merchant:</label>
                  <select
                    value={selectedMerchantId}
                    onChange={(e) => setSelectedMerchantId(e.target.value)}
                    className="px-3 py-2.5 border rounded-xl bg-white"
                  >
                    <option value="">All (global + all merchants)</option>
                    {merchants.map((m) => (
                      <option key={m.id} value={m.id}>
                       
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={loadPromoCodes}
                className="px-3 py-2.5 rounded-xl border hover:bg-gray-50 font-semibold flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                onClick={openCreate}
                className="px-3 py-2.5 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold flex items-center gap-2 shadow"
              >
                <Plus size={16} />
                Create
              </button>

              <button
                onClick={handleLogout}
                className="px-3 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-semibold flex items-center gap-2"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-28 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredList.length > 0 ? (
          <div className="grid gap-3">
            {filteredList.map((promo) => {
              const dealType = (promo.deal_type ?? 'cart_discount') as DealType;
              const isBxgy = dealType === 'bxgy';
              const priority = clampNum((promo as any).priority, 0);
              const auto = !!(promo as any).auto_apply;

              return (
                <div
                  key={promo.id}
                  className={cx(
                    'bg-white rounded-2xl border shadow-sm p-4 border-l-4',
                    promo.is_active ? 'border-green-500' : 'border-gray-300',
                    'hover:shadow-md transition-shadow'
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="text-primary" size={18} />
                        <h3 className="text-xl font-bold text-gray-900">{promo.code}</h3>

                        <button onClick={() => copyCode(promo.code)} className="text-gray-500 hover:text-primary" title="Copy code">
                          <Copy size={16} />
                        </button>

                        <Pill tone={promo.is_active ? 'green' : 'gray'}>{promo.is_active ? 'Active' : 'Inactive'}</Pill>
                        <Pill tone={isBxgy ? 'purple' : 'blue'}>{isBxgy ? 'BXGY Offer' : 'Cart Discount'}</Pill>

                        {auto && <Pill tone="orange">Auto apply</Pill>}
                        {priority > 0 && <Pill tone="yellow">Priority {priority}</Pill>}

                        {promo.merchant_id ? <Pill tone="purple">Merchant</Pill> : <Pill tone="gray">Global</Pill>}
                      </div>

                      {promo.description && <p className="text-sm text-gray-600 mt-2">{promo.description}</p>}

                      <div className="grid sm:grid-cols-5 gap-3 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">Type</span>
                          <p className="font-semibold flex items-center gap-2">
                            {isBxgy ? <Gift size={16} /> : <BadgePercent size={16} />}
                            {isBxgy ? 'Buy X Get Y' : 'Discount'}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">Value</span>
                          <p className="font-semibold">
                            {isBxgy
                              ? promo.deal_json?.buy && promo.deal_json?.get
                                ? `Buy ${promo.deal_json.buy.qty} Get ${promo.deal_json.get.qty}`
                                : '—'
                              : promo.discount_type === 'percentage'
                                ? `${promo.discount_value}%`
                                : `₹${promo.discount_value}`}
                          </p>
                        </div>

                        <div>
                          <span className="text-gray-500">Min order</span>
                          <p className="font-semibold">₹{promo.min_order_amount ?? 0}</p>
                        </div>

                        <div>
                          <span className="text-gray-500">Valid until</span>
                          <p className="font-semibold">{formatDateOrDash(promo.valid_until)}</p>
                        </div>

                        <div>
                          <span className="text-gray-500">Days/time</span>
                          <p className="font-semibold">
                            {formatDays(promo.valid_days)}{' '}
                            {promo.start_time && promo.end_time
                              ? `(${String(promo.start_time).slice(0, 5)}-${String(promo.end_time).slice(0, 5)})`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        className={cx(
                          'px-3 py-2.5 rounded-xl font-semibold',
                          promo.is_active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'
                        )}
                      >
                        {promo.is_active ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => openEdit(promo)}
                        className="px-3 py-2.5 bg-blue-100 text-blue-800 rounded-xl hover:bg-blue-200 font-semibold"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(promo)}
                        className="px-3 py-2.5 bg-red-100 text-red-800 rounded-xl hover:bg-red-200 font-semibold"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border">
            <Sparkles size={56} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No offers yet</h3>
            <p className="text-gray-600">Create your first promo or BXGY offer.</p>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto border shadow-2xl">
              <div className="sticky top-0 bg-white border-b p-4 sm:p-6 rounded-t-2xl flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold">{editingPromo ? 'Edit Offer' : 'Create Offer'}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Preview: <span className="font-semibold">{offerPreview}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
                {/* Top controls */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Deal type *</label>
                    <select
                      value={form.deal_type}
                      onChange={(e) => {
                        const next = e.target.value as DealType;
                        setForm((p) => ({ ...p, deal_type: next }));
                        setPickingSide(next === 'bxgy' ? SIDE_BUY : SIDE_TARGETS);
                        setMenuPanelOpen(false);
                        setMenuSearch('');
                        setMenuVisibleCount(48);
                        if (next === 'bxgy' && form.scope === 'global') setForm((p) => ({ ...p, scope: 'merchant' }));
                      }}
                      className="w-full px-4 py-3 border rounded-xl bg-white font-semibold"
                    >
                      <option value="cart_discount">Cart Discount (code-based)</option>
                      <option value="bxgy">Buy X Get Y (BOGO / BXGY)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                    <input
                      type="number"
                      value={form.priority}
                      onChange={(e) => setForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                      className="w-full px-4 py-3 border rounded-xl"
                      min={0}
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher priority wins when multiple offers apply.</p>
                  </div>

                  <div className="flex items-end">
                    <label className="w-full flex items-center justify-between gap-3 border rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-50">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">Auto apply</div>
                        <div className="text-xs text-gray-600">If enabled, code can be empty.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!form.auto_apply}
                        onChange={(e) => setForm((p) => ({ ...p, auto_apply: e.target.checked }))}
                        className="w-5 h-5"
                      />
                    </label>
                  </div>
                </div>

                {/* Code + Scope */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Promo code {form.auto_apply ? '(optional)' : '*'}
                    </label>
                    <input
                      type="text"
                      value={form.code}
                      onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 border rounded-xl uppercase"
                      placeholder={form.auto_apply ? 'AUTO-GENERATED (optional)' : 'WELCOME50'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scope *</label>
                    <select
                      value={form.scope}
                      onChange={(e) => {
                        const nextScope = e.target.value as PromoScope;
                        setForm((p) => ({ ...p, scope: nextScope }));
                        setPickingSide(nextScope === 'targets' ? SIDE_TARGETS : pickingSide);
                        setMenuPanelOpen(false);
                        setMenuSearch('');
                        setMenuVisibleCount(48);
                      }}
                      className="w-full px-4 py-3 border rounded-xl bg-white"
                    >
                      {mode === 'admin' && form.deal_type !== 'bxgy' && <option value="global">Global (admin)</option>}
                      <option value="merchant">{mode === 'merchant' ? 'My restaurant' : 'Specific merchant'}</option>
                      {form.deal_type === 'cart_discount' && <option value="targets">Specific menu items</option>}
                    </select>
                  </div>

                  {showMerchantSelect && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Merchant/Restaurant *</label>
                      <select
                        value={form.merchant_id}
                        onChange={(e) => {
                          setForm((p) => ({ ...p, merchant_id: e.target.value }));
                          setMenuPanelOpen(false);
                          setMenuSearch('');
                          setMenuVisibleCount(48);
                        }}
                        className="w-full px-4 py-3 border rounded-xl bg-white"
                        required
                      >
                        <option value="">Select merchant</option>
                        {merchants.map((m) => (
                          <option key={m.id} value={m.id}>
                           
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Deal section */}
                {form.deal_type === 'cart_discount' ? (
                  <div className="bg-gray-50 border rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BadgePercent className="text-primary" size={18} />
                      <h3 className="font-bold text-gray-900">Cart discount setup</h3>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Type *</label>
                        <select
                          value={form.discount_type}
                          onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as DiscountType }))}
                          className="w-full px-4 py-3 border rounded-xl bg-white"
                        >
                          <option value="percentage">Percentage (%)</option>
                          <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Discount Value *</label>
                        <input
                          type="number"
                          value={form.discount_value}
                          onChange={(e) => setForm((p) => ({ ...p, discount_value: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          required
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Min Order Amount (₹)</label>
                        <input
                          type="number"
                          value={form.min_order_amount}
                          onChange={(e) => setForm((p) => ({ ...p, min_order_amount: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max Discount Amount (₹)</label>
                        <input
                          type="number"
                          value={form.max_discount_amount}
                          onChange={(e) => setForm((p) => ({ ...p, max_discount_amount: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Usage Limit (global)</label>
                        <input
                          type="number"
                          value={form.usage_limit}
                          onChange={(e) => setForm((p) => ({ ...p, usage_limit: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max uses per user</label>
                        <input
                          type="number"
                          value={form.max_uses_per_user}
                          onChange={(e) => setForm((p) => ({ ...p, max_uses_per_user: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min="0"
                        />
                      </div>

                      {form.scope === 'targets' && (
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={() => openMenuPicker(SIDE_TARGETS)}
                            className={cx(
                              'px-3 py-2 rounded-xl border font-semibold inline-flex items-center gap-2',
                              pickingSide === SIDE_TARGETS ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                            )}
                          >
                            Pick targets <ChevronDown size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Gift className="text-purple-700" size={18} />
                      <h3 className="font-bold text-gray-900">Buy X Get Y setup</h3>
                      <Pill tone="purple">BOGO</Pill>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Buy quantity *</label>
                        <input
                          type="number"
                          value={form.bxgy_buy_qty}
                          onChange={(e) => setForm((p) => ({ ...p, bxgy_buy_qty: Number(e.target.value) }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min={1}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Get quantity *</label>
                        <input
                          type="number"
                          value={form.bxgy_get_qty}
                          onChange={(e) => setForm((p) => ({ ...p, bxgy_get_qty: Number(e.target.value) }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min={1}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max sets per order</label>
                        <input
                          type="number"
                          value={form.bxgy_max_sets_per_order}
                          onChange={(e) => setForm((p) => ({ ...p, bxgy_max_sets_per_order: Number(e.target.value) }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min={1}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Get discount type *</label>
                        <select
                          value={form.bxgy_get_discount_type}
                          onChange={(e) => setForm((p) => ({ ...p, bxgy_get_discount_type: e.target.value as any }))}
                          className="w-full px-4 py-3 border rounded-xl bg-white font-semibold"
                        >
                          <option value="free">Free</option>
                          <option value="percentage">Percentage (%) off</option>
                          <option value="fixed">Fixed (₹) off</option>
                        </select>
                      </div>

                      <div className={cx(form.bxgy_get_discount_type === 'free' && 'opacity-50 pointer-events-none')}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Get discount value {form.bxgy_get_discount_type === 'free' ? '' : '*'}
                        </label>
                        <input
                          type="number"
                          value={form.bxgy_get_discount_value}
                          onChange={(e) => setForm((p) => ({ ...p, bxgy_get_discount_value: e.target.value }))}
                          className="w-full px-4 py-3 border rounded-xl"
                          min={0}
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Selection mode</label>
                        <select
                          value={form.bxgy_selection}
                          onChange={(e) => setForm((p) => ({ ...p, bxgy_selection: e.target.value as any }))}
                          className="w-full px-4 py-3 border rounded-xl bg-white"
                        >
                          <option value="auto_cheapest">Auto apply (cheapest eligible)</option>
                          <option value="customer_choice">Customer chooses free item</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4 mt-5">
                      <div className="bg-white border rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-gray-900">Buy items *</div>
                          <button
                            type="button"
                            onClick={() => openMenuPicker(SIDE_BUY)}
                            className={cx(
                              'px-3 py-2 rounded-xl border font-semibold flex items-center gap-2',
                              pickingSide === SIDE_BUY ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50'
                            )}
                          >
                            Pick <ChevronDown size={16} />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {bxgyBuyItems.length === 0 ? (
                            <div className="text-sm text-gray-600">Select items that qualify as “Buy”.</div>
                          ) : (
                            bxgyBuyItems.map((it) => <Chip key={it.id} it={it} onRemove={() => removePickedItem(it.id, SIDE_BUY)} />)
                          )}
                        </div>
                      </div>

                      <div className="bg-white border rounded-2xl p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-gray-900">Get items *</div>
                          <button
                            type="button"
                            onClick={() => openMenuPicker(SIDE_GET)}
                            className={cx(
                              'px-3 py-2 rounded-xl border font-semibold flex items-center gap-2',
                              pickingSide === SIDE_GET ? 'bg-purple-50 border-purple-300' : 'hover:bg-gray-50'
                            )}
                          >
                            Pick <ChevronDown size={16} />
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {bxgyGetItems.length === 0 ? (
                            <div className="text-sm text-gray-600">Select items eligible as “Get”.</div>
                          ) : (
                            bxgyGetItems.map((it) => <Chip key={it.id} it={it} onRemove={() => removePickedItem(it.id, SIDE_GET)} />)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Menu picker grid (NO IMAGES) */}
                {(form.deal_type === 'bxgy' || (form.deal_type === 'cart_discount' && form.scope === 'targets')) && (
                  <div ref={pickerRef} className="bg-white border rounded-2xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-bold text-gray-900">
                        Menu picker{' '}
                        <span className="text-sm font-semibold text-gray-600">
                          (adding to: {pickingSide === SIDE_TARGETS ? 'Targets' : pickingSide === SIDE_BUY ? 'Buy' : 'Get'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openMenuPicker(pickingSide)}
                          className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={closeMenuPicker}
                          className="px-3 py-2 rounded-xl border hover:bg-gray-50 font-semibold"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {menuPanelOpen && (
                      <>
                        {/* Controls (like full menu page) */}
                        <div className="mt-4 bg-white rounded-2xl border p-4">
                          <div className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                ref={menuInputRef}
                                value={menuSearch}
                                onChange={(e) => setMenuSearch(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                                placeholder="Search items, category..."
                              />
                              {menuSearch && (
                                <button
                                  type="button"
                                  onClick={() => setMenuSearch('')}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                                  aria-label="Clear search"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => setMenuVegOnly((v) => !v)}
                                className={cx(
                                  'px-3 py-3 rounded-xl border-2 font-extrabold inline-flex items-center gap-2 transition',
                                  menuVegOnly
                                    ? 'border-green-600 bg-green-50 text-green-700'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                )}
                              >
                                <Leaf className="w-5 h-5" />
                                Veg
                              </button>

                              <div className="px-3 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-extrabold inline-flex items-center gap-2">
                                <SlidersHorizontal className="w-5 h-5" />
                                <select
                                  value={menuSortKey}
                                  onChange={(e) => setMenuSortKey(e.target.value as MenuSortKey)}
                                  className="bg-transparent outline-none"
                                  aria-label="Sort"
                                >
                                  <option value="recommended">Recommended</option>
                                  <option value="price_low">Price: Low → High</option>
                                  <option value="price_high">Price: High → Low</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-gray-600 font-semibold">
                            Showing {menuGridItems.length} / {flatMenuFiltered.length} items
                          </div>
                        </div>

                        {/* Grid (no images) */}
                       {menuLoadError ? (
  <div className="mt-4 bg-white rounded-2xl border p-10 text-center text-red-700 font-bold">
    {menuLoadError}
  </div>
) : menuLoading ? (
  <div className="mt-4 text-gray-600 font-semibold">Loading menu…</div>
) : flatMenuFiltered.length === 0 ? (
  <div className="mt-4 bg-white rounded-2xl border p-10 text-center text-gray-600 font-bold">
    No menu items found
  </div>
) : (
                          <>
                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                              {menuGridItems.map((item: any) => {
                                const picked = isSelected(item.id, pickingSide);

                                return (
                                  <div
                                    key={item.id}
                                    className={cx(
                                      'bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden',
                                      picked ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'
                                    )}
                                  >
                                    <div className="p-3">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="font-extrabold text-gray-900 line-clamp-1">{item.name}</div>
                                          <div className="text-xs text-gray-600 line-clamp-1">
                                            {String(item.category || item.category_id || 'Other')}
                                          </div>
                                        </div>

                                        {picked ? (
                                          <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2 py-1 rounded-full bg-orange-100 text-orange-800">
                                            <Check className="w-4 h-4" />
                                            Selected
                                          </span>
                                        ) : null}
                                      </div>

                                      {item.description && (
                                        <div className="text-xs text-gray-600 mt-2 line-clamp-2">{item.description}</div>
                                      )}

                                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        {item.is_veg != null && (
                                          <span
                                            className={cx(
                                              'text-xs font-extrabold px-2 py-1 rounded-full',
                                              item.is_veg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            )}
                                          >
                                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                                          </span>
                                        )}

                                        {item.is_available === false && (
                                          <span className="text-xs font-extrabold px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                            Unavailable
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-3 flex items-center justify-between gap-2">
                                        <span className="font-extrabold text-gray-900">₹{Number(item.price || 0).toFixed(2)}</span>

                                        <button
                                          type="button"
                                          onClick={() => togglePick(item)}
                                          className={cx(
                                            'px-3 py-2 rounded-xl font-extrabold',
                                            picked
                                              ? 'bg-gray-900 text-white hover:bg-black'
                                              : 'bg-primary text-white hover:bg-orange-600'
                                          )}
                                        >
                                          {picked ? 'Remove' : 'Select'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Load more */}
                            {menuVisibleCount < flatMenuFiltered.length && (
                              <div className="mt-6 flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setMenuVisibleCount((c) => Math.min(c + 80, flatMenuFiltered.length))}
                                  className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow font-extrabold text-gray-900"
                                >
                                  Load more
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMenuVisibleCount(flatMenuFiltered.length)}
                                  className="px-5 py-3 rounded-2xl bg-gray-900 text-white hover:bg-black font-extrabold"
                                >
                                  Show all ({flatMenuFiltered.length})
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* Selected chips preview */}
                    <div className="mt-5 grid lg:grid-cols-3 gap-3">
                      <div className="bg-gray-50 border rounded-2xl p-3">
                        <div className="font-bold text-gray-900 mb-2">Targets</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedMenuItems.length === 0 ? (
                            <div className="text-sm text-gray-600">—</div>
                          ) : (
                            selectedMenuItems.map((it) => <Chip key={it.id} it={it} onRemove={() => removePickedItem(it.id, SIDE_TARGETS)} />)
                          )}
                        </div>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                        <div className="font-bold text-gray-900 mb-2">BXGY Buy</div>
                        <div className="flex flex-wrap gap-2">
                          {bxgyBuyItems.length === 0 ? (
                            <div className="text-sm text-gray-600">—</div>
                          ) : (
                            bxgyBuyItems.map((it) => <Chip key={it.id} it={it} onRemove={() => removePickedItem(it.id, SIDE_BUY)} />)
                          )}
                        </div>
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                        <div className="font-bold text-gray-900 mb-2">BXGY Get</div>
                        <div className="flex flex-wrap gap-2">
                          {bxgyGetItems.length === 0 ? (
                            <div className="text-sm text-gray-600">—</div>
                          ) : (
                            bxgyGetItems.map((it) => <Chip key={it.id} it={it} onRemove={() => removePickedItem(it.id, SIDE_GET)} />)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Timing + description */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid From (optional)</label>
                    <input
                      type="date"
                      value={form.valid_from}
                      onChange={(e) => setForm((p) => ({ ...p, valid_from: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Until (optional)</label>
                    <input
                      type="date"
                      value={form.valid_until}
                      onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Valid Days (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((d) => (
                        <button
                          type="button"
                          key={d.n}
                          onClick={() => onToggleDay(d.n)}
                          className={cx(
                            'px-3 py-2 rounded-xl border text-sm font-semibold',
                            form.valid_days.includes(d.n) ? 'bg-primary text-white border-primary' : 'bg-white hover:bg-gray-50'
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, valid_days: [] }))}
                        className="px-3 py-2 rounded-xl border text-sm font-semibold hover:bg-gray-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time (optional)</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">End Time (optional)</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-xl"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-4 py-3 border rounded-xl"
                      rows={3}
                      placeholder="Example: Buy 1 Espresso & get 1 Espresso free (limited)."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="grid sm:grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-3 rounded-xl bg-gray-200 hover:bg-gray-300 font-semibold"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-3 rounded-xl bg-primary text-white hover:bg-orange-600 font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Saving…' : editingPromo ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
