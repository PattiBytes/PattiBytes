/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save, Loader2, Plus, Minus, Trash2, Search,
  Package, DollarSign, Clock, CreditCard, User,
  FileText, Settings2, ShoppingCart, ChevronDown,
  X, Leaf, Drumstick, ImageOff, RefreshCw, Percent,
  Bell, BellRing, StickyNote, CheckCircle,
} from 'lucide-react';
import {
  toDatetimeLocal, type OrderNormalized, type EditFields, cx,
} from './types';
import { CUSTOM_ORDER_STATUSES } from './StatusControl';
import { supabase } from '@/lib/supabase';

// ── Local types ───────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_veg: boolean;
  category: string;
  image_url: string;
  menu_item_id: string;
  merchant_id: string;
  discount_percentage: number;
  category_id: string | null;
  note?: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string;
  is_veg: boolean;
  is_available: boolean;
  discount_percentage: number;
  description: string;
}

interface Props {
  order: OrderNormalized;
  saving: boolean;
  onSave: (fields: EditFields & { items: OrderItem[] }) => void;
}

const IC = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm ' +
           'focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-white';

function parseItems(order: OrderNormalized): OrderItem[] {
  try {
    const raw = (order as any).items;
    if (Array.isArray(raw)) return raw as OrderItem[];
    if (typeof raw === 'string') return JSON.parse(raw);
  } catch { /* empty */ }
  return [];
}

// ── Accordion section ─────────────────────────────────────────────────────────
function Section({
  icon, title, color, badge, defaultOpen = false, children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
      open ? 'border-gray-200 shadow-sm' : 'border-gray-100'
    }`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3.5 transition-all duration-200 ${
          open ? 'bg-white' : 'bg-gray-50/60 hover:bg-gray-50'
        }`}
      >
        <span className="flex items-center gap-2.5 font-bold text-gray-800 text-sm">
          <span className={`w-7 h-7 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
          </span>
          {title}
          {badge !== undefined && (
            <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-2 border-t border-gray-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function VegBadge({ isVeg }: { isVeg: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md border ${
      isVeg ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'
    }`}>
      {isVeg ? <Leaf className="w-2.5 h-2.5" /> : <Drumstick className="w-2.5 h-2.5" />}
      {isVeg ? 'VEG' : 'NON'}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AdminEditPanel({ order, saving, onSave }: Props) {
  const [fields, setFields] = useState<EditFields>({
    paymentStatus:         order.paymentStatus        ?? 'pending',
    deliveryFee:           String(order.deliveryFee),
    discount:              String(order.discount),
    estimatedDeliveryTime: toDatetimeLocal(order.estimatedDeliveryTime),
    actualDeliveryTime:    toDatetimeLocal(order.actualDeliveryTime),
    preparationTime:       order.preparationTime != null ? String(order.preparationTime) : '',
    customerNotes:         order.customerNotes        ?? '',
    specialInstructions:   order.specialInstructions  ?? '',
    deliveryInstructions:  order.deliveryInstructions ?? '',
    cancellationReason:    order.cancellationReason   ?? '',
    recipientName:         order.recipientName        ?? '',
    customOrderStatus:     order.customOrderStatus    ?? '',
    quotedAmount:          order.quotedAmount != null ? String(order.quotedAmount) : '',
    quoteMessage:          order.quoteMessage         ?? '',
    platformHandled:       !!order.platformHandled,
  });

  const [items,     setItems]     = useState<OrderItem[]>(parseItems(order));
  const [origItems] = useState<OrderItem[]>(parseItems(order));

  const [menuItems,    setMenuItems]    = useState<MenuItem[]>([]);
  const [menuLoading,  setMenuLoading]  = useState(false);
  const [menuSearch,   setMenuSearch]   = useState('');
  const [showCatalog,  setShowCatalog]  = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Admin notes state ─────────────────────────────────────────────────────
  const [adminNote,       setAdminNote]       = useState<string>((order as any).admin_notes ?? '');
  const [sendingNote,     setSendingNote]     = useState(false);
  const [noteSent,        setNoteSent]        = useState(false);
  const [noteError,       setNoteError]       = useState<string | null>(null);

  // Sync on order refresh
  useEffect(() => {
    setFields({
      paymentStatus:         order.paymentStatus        ?? 'pending',
      deliveryFee:           String(order.deliveryFee),
      discount:              String(order.discount),
      estimatedDeliveryTime: toDatetimeLocal(order.estimatedDeliveryTime),
      actualDeliveryTime:    toDatetimeLocal(order.actualDeliveryTime),
      preparationTime:       order.preparationTime != null ? String(order.preparationTime) : '',
      customerNotes:         order.customerNotes        ?? '',
      specialInstructions:   order.specialInstructions  ?? '',
      deliveryInstructions:  order.deliveryInstructions ?? '',
      cancellationReason:    order.cancellationReason   ?? '',
      recipientName:         order.recipientName        ?? '',
      customOrderStatus:     order.customOrderStatus    ?? '',
      quotedAmount:          order.quotedAmount != null ? String(order.quotedAmount) : '',
      quoteMessage:          order.quoteMessage         ?? '',
      platformHandled:       !!order.platformHandled,
    });
    setItems(parseItems(order));
    setAdminNote((order as any).admin_notes ?? '');
    setNoteSent(false);
  }, [order]);

  // Load merchant menu catalog
  const loadMenu = useCallback(async () => {
    const merchantId = (order as any).merchant_id || (order as any).merchantId;
    if (!merchantId) return;
    setMenuLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,name,price,category,image_url,is_veg,is_available,discount_percentage,description')
        .eq('merchant_id', merchantId)
        .eq('is_available', true)
        .order('category')
        .order('name');
      if (!error && data) setMenuItems(data as MenuItem[]);
    } finally {
      setMenuLoading(false);
    }
  }, [order]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const openCatalog = () => {
    setShowCatalog(true);
    setMenuSearch('');
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const set = <K extends keyof EditFields>(k: K, v: EditFields[K]) =>
    setFields(p => ({ ...p, [k]: v }));

  const itemsSubtotal  = items.reduce((s, it) => {
    const disc = it.discount_percentage > 0
      ? it.price * (1 - it.discount_percentage / 100)
      : it.price;
    return s + disc * it.quantity;
  }, 0);
  const deliveryFeeNum = parseFloat(fields.deliveryFee)  || 0;
  const discountNum    = parseFloat(fields.discount)     || 0;
  const orderTotal     = itemsSubtotal + deliveryFeeNum - discountNum;
  const itemsChanged   = JSON.stringify(items) !== JSON.stringify(origItems);

  const filteredMenu = menuItems.filter(m =>
    m.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    m.category.toLowerCase().includes(menuSearch.toLowerCase())
  );

  const catalogGroups = filteredMenu.reduce<Record<string, MenuItem[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  // ── Item operations ───────────────────────────────────────────────────────
  const changeQty = (id: string, delta: number) =>
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, quantity: Math.max(1, it.quantity + delta) } : it
    ));

  const changePrice = (id: string, val: string) =>
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, price: parseFloat(val) || 0 } : it
    ));

  const changeDiscount = (id: string, val: string) =>
    setItems(prev => prev.map(it =>
      it.id === id ? { ...it, discount_percentage: parseFloat(val) || 0 } : it
    ));

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));

  const addFromCatalog = (m: MenuItem) => {
    const existing = items.find(it => it.menu_item_id === m.id);
    if (existing) {
      changeQty(existing.id, 1);
    } else {
      setItems(prev => [...prev, {
        id:                  crypto.randomUUID(),
        name:                m.name,
        price:               m.price,
        quantity:            1,
        is_veg:              m.is_veg,
        category:            m.category,
        image_url:           m.image_url || '',
        menu_item_id:        m.id,
        merchant_id:         (order as any).merchant_id || (order as any).merchantId || '',
        discount_percentage: m.discount_percentage || 0,
        category_id:         null,
      }]);
    }
    setShowCatalog(false);
  };

  // ── Save handler — passes items + recalculated subtotal/total ────────────
  const handleSave = () => {
    onSave({
      ...fields,
      items,
      // Pass computed totals so parent can persist correct values
      _computedSubtotal: itemsSubtotal,
      _computedTotal:    orderTotal,
    } as any);
  };

  // ── Admin note + push notification ───────────────────────────────────────
  const handleSendAdminNote = useCallback(async () => {
    if (!adminNote.trim()) return;
    setSendingNote(true);
    setNoteError(null);
    setNoteSent(false);

    try {
      const customerId = (order as any).customer_id || (order as any).customerId;
      const orderId    = (order as any).id;
      const orderNum   = (order as any).order_number || (order as any).orderNumber || orderId?.slice(0, 8);

      // 1. Save admin note to orders table
      const { error: dbErr } = await supabase
        .from('orders')
        .update({
          admin_notes:             adminNote.trim(),
          admin_notes_updated_at:  new Date().toISOString(),
          admin_notes_push_sent:   false,
          updated_at:              new Date().toISOString(),
        })
        .eq('id', orderId);

      if (dbErr) throw dbErr;

      // 2. Save in-app notification row for customer
      await supabase.from('notifications').insert({
        user_id:    customerId,
        title:      `Note on Order #${orderNum}`,
        message:    adminNote.trim(),
        type:       'order',
        data:       { order_id: orderId, order_number: String(orderNum), type: 'admin_note' },
        body:       adminNote.trim(),
        is_read:    false,
        sent_push:  false,
        created_at: new Date().toISOString(),
      });

      // 3. Send push notification via your existing /api/notify endpoint
      const { data: sessionData } = await supabase.auth.getSession();
      const jwt = sessionData?.session?.access_token;

      if (jwt && customerId) {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://pbexpress.pattibytes.com';
        await fetch(`${API_BASE}/api/notify`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            targetUserId: customerId,
            title:        `📋 Note on Order #${orderNum}`,
            message:      adminNote.trim(),
            type:         'admin_note',
            data: {
              order_id:     orderId,
              order_number: String(orderNum),
              type:         'admin_note',
            },
          }),
        });

        // Mark push as sent
        await supabase
          .from('orders')
          .update({ admin_notes_push_sent: true })
          .eq('id', orderId);
      }

      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 4000);
    } catch (e: any) {
      setNoteError(e?.message ?? 'Failed to send note');
    } finally {
      setSendingNote(false);
    }
  }, [adminNote, order]);

  const isCustom = order.orderType === 'custom' || !!(order as any).customOrderRef;

  return (
    <div className="space-y-3">

      {/* ══ LIVE FINANCIAL SUMMARY ════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg shadow-orange-200/40">
        <p className="text-xs font-black uppercase tracking-widest text-orange-100/80 mb-3">
          Live Order Summary
        </p>
        <div className="space-y-1.5 text-sm">
          {[
            { label: `Items (${items.length})`,  value: itemsSubtotal },
            { label: 'Delivery fee',              value: deliveryFeeNum },
            { label: 'Discount',                  value: -discountNum, cls: discountNum > 0 ? 'text-green-300' : '' },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-orange-100/80 font-medium">{label}</span>
              <span className={`font-bold ${cls ?? 'text-white'}`}>
                {value < 0 ? '−' : ''}₹{Math.abs(value).toFixed(2)}
              </span>
            </div>
          ))}
          <div className="border-t border-white/20 pt-2 mt-2 flex justify-between items-center">
            <span className="font-black text-base">Total</span>
            <span className="font-black text-xl">₹{orderTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ══ 1. ORDER ITEMS ═══════════════════════════════════════════════════ */}
      <Section
        icon={<ShoppingCart className="w-4 h-4 text-white" />}
        color="bg-orange-500"
        title="Order Items"
        badge={items.length}
        defaultOpen
      >
        <div className="space-y-2 mt-1">
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm font-semibold">
              No items — add from catalog below
            </div>
          )}

          {items.map((item, idx) => (
            <div key={item.id}
              className={cx(
                'bg-gray-50 rounded-xl p-3 border border-gray-100 transition-all duration-200',
                'hover:border-orange-200 hover:bg-orange-50/30 group',
                'animate-in fade-in slide-in-from-top-1 duration-200',
              )}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 border border-gray-200">
                  {item.image_url && !item.image_url.startsWith('http://www.google') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <VegBadge isVeg={item.is_veg} />
                        <span className="text-[10px] text-gray-400 font-semibold">{item.category}</span>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg
                                 transition-all hover:scale-110 active:scale-95 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {/* Quantity stepper */}
                    <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-0.5">
                      <button onClick={() => changeQty(item.id, -1)}
                        disabled={item.quantity <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500
                                   hover:bg-orange-100 hover:text-orange-600 disabled:opacity-30
                                   transition-all hover:scale-110 active:scale-95">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-black text-gray-900">
                        {item.quantity}
                      </span>
                      <button onClick={() => changeQty(item.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500
                                   hover:bg-orange-100 hover:text-orange-600
                                   transition-all hover:scale-110 active:scale-95">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400 font-bold">₹</span>
                      <input
                        type="number" min={0} step="0.01"
                        value={item.price}
                        onChange={e => changePrice(item.id, e.target.value)}
                        className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold
                                   text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary
                                   transition bg-white"
                      />
                    </div>

                    {/* Discount % */}
                    <div className="flex items-center gap-1">
                      <Percent className="w-3 h-3 text-gray-400" />
                      <input
                        type="number" min={0} max={100} step="1"
                        value={item.discount_percentage}
                        onChange={e => changeDiscount(item.id, e.target.value)}
                        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold
                                   text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary
                                   transition bg-white"
                        placeholder="0"
                      />
                    </div>

                    {/* Line total */}
                    <span className="ml-auto text-sm font-black text-gray-800">
                      = ₹{(
                        (
                          item.discount_percentage > 0
                            ? item.price * (1 - item.discount_percentage / 100)
                            : item.price
                        ) * item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add from catalog */}
          <button
            type="button"
            onClick={openCatalog}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                       border-2 border-dashed border-orange-200 text-orange-500 font-bold text-sm
                       hover:bg-orange-50 hover:border-orange-400 transition-all
                       hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            Add item from menu catalog
          </button>
        </div>

        {/* Catalog modal */}
        {showCatalog && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center
                          justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl
                            max-h-[80vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
                <div>
                  <h3 className="font-black text-gray-900">Menu Catalog</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">
                    {menuItems.length} items available
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={loadMenu} title="Refresh"
                    className={`p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all hover:scale-110 ${menuLoading ? 'animate-spin' : ''}`}>
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowCatalog(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all hover:scale-110 active:scale-95">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-5 py-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={menuSearch}
                    onChange={e => setMenuSearch(e.target.value)}
                    placeholder="Search items or categories…"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm
                               focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                  {menuSearch && (
                    <button onClick={() => setMenuSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-3">
                {menuLoading ? (
                  <div className="flex items-center justify-center py-12 gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-semibold">Loading menu…</span>
                  </div>
                ) : Object.keys(catalogGroups).length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm font-semibold">
                    {menuSearch ? `No items matching "${menuSearch}"` : 'No items found'}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(catalogGroups).map(([cat, catItems]) => (
                      <div key={cat}>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                          {cat}
                        </p>
                        <div className="space-y-1.5">
                          {catItems.map(m => {
                            const alreadyAdded = items.some(it => it.menu_item_id === m.id);
                            return (
                              <button key={m.id} type="button" onClick={() => addFromCatalog(m)}
                                className={cx(
                                  'w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left',
                                  'transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]',
                                  alreadyAdded
                                    ? 'border-orange-300 bg-orange-50'
                                    : 'border-gray-100 hover:border-orange-200 hover:bg-orange-50/40'
                                )}
                              >
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                  {m.image_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.image_url} alt={m.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <ImageOff className="w-4 h-4 text-gray-300" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-gray-900 truncate">{m.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <VegBadge isVeg={m.is_veg} />
                                    {m.discount_percentage > 0 && (
                                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-1 rounded">
                                        {m.discount_percentage}% off
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-sm font-black text-gray-900">₹{m.price}</p>
                                  {alreadyAdded && (
                                    <p className="text-[10px] font-black text-orange-500">+1 qty</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* ══ 2. PAYMENT & STATUS ══════════════════════════════════════════════ */}
      <Section icon={<CreditCard className="w-4 h-4 text-white" />} color="bg-blue-500" title="Payment & Status">
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Payment Status</label>
            <select value={fields.paymentStatus} onChange={e => set('paymentStatus', e.target.value)} className={IC}>
              {['pending', 'paid', 'failed', 'refunded'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          {isCustom && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Custom Order Status</label>
              <select value={fields.customOrderStatus} onChange={e => set('customOrderStatus', e.target.value)} className={IC}>
                <option value="">— unchanged —</option>
                {CUSTOM_ORDER_STATUSES.map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          )}
          {isCustom && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Quoted Amount (₹)</label>
              <input type="number" min={0} step="0.01" className={IC}
                value={fields.quotedAmount}
                onChange={e => set('quotedAmount', e.target.value)}
                placeholder="e.g. 250.00" />
            </div>
          )}
        </div>
        {isCustom && (
          <label className="flex items-center gap-3 cursor-pointer select-none mt-4">
            <div onClick={() => set('platformHandled', !fields.platformHandled)}
              className={cx('relative w-11 h-6 rounded-full transition-colors duration-200',
                fields.platformHandled ? 'bg-primary' : 'bg-gray-200')}>
              <span className={cx('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
                fields.platformHandled ? 'translate-x-5' : 'translate-x-0.5')} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Platform Handled</span>
          </label>
        )}
      </Section>

      {/* ══ 3. FINANCIALS ════════════════════════════════════════════════════ */}
      <Section icon={<DollarSign className="w-4 h-4 text-white" />} color="bg-green-500" title="Financials">
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Delivery Fee (₹)</label>
            <input type="number" min={0} step="0.01" className={IC}
              value={fields.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Discount (₹)</label>
            <input type="number" min={0} step="0.01" className={IC}
              value={fields.discount} onChange={e => set('discount', e.target.value)} />
          </div>
        </div>
        <div className="mt-3 bg-gray-50 rounded-xl p-3 text-xs space-y-1.5 font-semibold">
          <div className="flex justify-between text-gray-500">
            <span>Items subtotal</span><span>₹{itemsSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Delivery</span><span>+₹{deliveryFeeNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Discount</span><span>−₹{discountNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-black border-t border-gray-200 pt-1.5">
            <span>New Total</span><span>₹{orderTotal.toFixed(2)}</span>
          </div>
        </div>
      </Section>

      {/* ══ 4. TIMING ════════════════════════════════════════════════════════ */}
      <Section icon={<Clock className="w-4 h-4 text-white" />} color="bg-purple-500" title="Timing">
        <div className="grid sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Prep Time (min)</label>
            <input type="number" min={0} className={IC}
              value={fields.preparationTime}
              onChange={e => set('preparationTime', e.target.value)}
              placeholder="e.g. 30" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Est. Delivery Time</label>
            <input type="datetime-local" className={IC}
              value={fields.estimatedDeliveryTime}
              onChange={e => set('estimatedDeliveryTime', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Actual Delivery Time</label>
            <input type="datetime-local" className={IC}
              value={fields.actualDeliveryTime}
              onChange={e => set('actualDeliveryTime', e.target.value)} />
          </div>
        </div>
      </Section>

      {/* ══ 5. RECIPIENT ═════════════════════════════════════════════════════ */}
      <Section icon={<User className="w-4 h-4 text-white" />} color="bg-teal-500" title="Recipient & Delivery">
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Recipient Name</label>
            <input type="text" className={IC}
              value={fields.recipientName}
              onChange={e => set('recipientName', e.target.value)}
              placeholder="e.g. Ranjit Singh" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Delivery Instructions</label>
            <textarea rows={2} className={cx(IC, 'resize-none')}
              value={fields.deliveryInstructions}
              onChange={e => set('deliveryInstructions', e.target.value)} />
          </div>
        </div>
      </Section>

      {/* ══ 6. NOTES ═════════════════════════════════════════════════════════ */}
      <Section icon={<FileText className="w-4 h-4 text-white" />} color="bg-amber-500" title="Notes & Instructions">
        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Customer Notes</label>
            <textarea rows={2} className={cx(IC, 'resize-none')}
              value={fields.customerNotes}
              onChange={e => set('customerNotes', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Special Instructions</label>
            <textarea rows={2} className={cx(IC, 'resize-none')}
              value={fields.specialInstructions}
              onChange={e => set('specialInstructions', e.target.value)} />
          </div>
          {isCustom && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Quote Message</label>
              <textarea rows={3} className={cx(IC, 'resize-none')}
                value={fields.quoteMessage}
                onChange={e => set('quoteMessage', e.target.value)}
                placeholder="Admin reply to customer's custom order…" />
            </div>
          )}
          {order.status === 'cancelled' && (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Cancellation Reason</label>
              <textarea rows={2} className={cx(IC, 'resize-none')}
                value={fields.cancellationReason}
                onChange={e => set('cancellationReason', e.target.value)} />
            </div>
          )}
        </div>
      </Section>

      {/* ══ 7. ADMIN NOTE + PUSH NOTIFICATION ════════════════════════════════ */}
      <Section
        icon={<BellRing className="w-4 h-4 text-white" />}
        color="bg-violet-600"
        title="Admin Note to Customer"
        badge={adminNote.trim() ? '!' : undefined}
        defaultOpen={false}
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            Write a note that will be saved on the order and sent as a <strong>push notification</strong> to the customer.
            Use this for updates like delays, substitutions, or special messages.
          </p>

          {/* Existing note preview */}
          {(order as any).admin_notes && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-violet-500 uppercase tracking-widest mb-1">
                Last Note Sent
              </p>
              <p className="text-sm text-violet-900 font-medium">{(order as any).admin_notes}</p>
              {(order as any).admin_notes_updated_at && (
                <p className="text-[10px] text-violet-400 mt-1">
                  {new Date((order as any).admin_notes_updated_at).toLocaleString('en-IN')}
                  {(order as any).admin_notes_push_sent && (
                    <span className="ml-2 text-green-600 font-black">✓ Push sent</span>
                  )}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              New Note / Message
            </label>
            <textarea
              rows={3}
              className={cx(IC, 'resize-none')}
              value={adminNote}
              onChange={e => { setAdminNote(e.target.value); setNoteSent(false); setNoteError(null); }}
              placeholder="e.g. Your order is slightly delayed due to high demand. ETA 15 more minutes!"
            />
          </div>

          {noteError && (
            <p className="text-xs text-red-600 font-semibold bg-red-50 rounded-lg px-3 py-2">
              ⚠️ {noteError}
            </p>
          )}

          {noteSent && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2
                            animate-in fade-in duration-300">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-700 font-bold">
                Note saved &amp; push notification sent to customer!
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSendAdminNote}
            disabled={sendingNote || !adminNote.trim()}
            className={cx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm',
              'transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]',
              adminNote.trim()
                ? 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200/50'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
          >
            {sendingNote
              ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</>
              : <><Bell className="w-4 h-4" />Save Note &amp; Notify Customer</>
            }
          </button>
          <p className="text-center text-[10px] text-gray-400">
            This sends a push + in-app notification to the customer immediately.
          </p>
        </div>
      </Section>

      {/* ══ SAVE BUTTON ══════════════════════════════════════════════════════ */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-orange-600
                   text-white py-3.5 rounded-2xl hover:shadow-lg hover:shadow-orange-200/50
                   hover:scale-[1.01] active:scale-[0.99] font-black disabled:opacity-50
                   transition-all duration-200 text-sm"
      >
        {saving
          ? <><Loader2 className="w-5 h-5 animate-spin" />Saving changes…</>
          : <><Save className="w-5 h-5" />Save All Changes</>
        }
      </button>

      {itemsChanged && (
        <p className="text-center text-xs text-amber-600 font-semibold animate-in fade-in duration-300">
          ⚠️ Order items have been modified — save to apply
        </p>
      )}
    </div>
  );
}