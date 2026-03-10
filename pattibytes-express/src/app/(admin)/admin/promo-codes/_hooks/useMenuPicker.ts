/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MenuItemLite, MenuPickSide, MenuSortKey } from '../_types';

const CACHE_TTL = 5 * 60 * 1000;

function scoreMatch(name: string, desc: string | null | undefined, q: string) {
  const n = String(name || '').toLowerCase();
  const d = String(desc  || '').toLowerCase();
  const s = String(q     || '').toLowerCase();
  if (!s) return 0;
  if (n === s)            return 1000;
  if (n.startsWith(s))    return 850;
  if (n.includes(s))      return 600;
  const tokens = s.split(/\s+/).filter(Boolean);
  let hits = 0;
  for (const t of tokens) { if (n.includes(t)) hits += 3; else if (d.includes(t)) hits += 1; }
  return hits * 120;
}

export function useMenuPicker() {
  const cacheRef     = useRef(new Map<string, { ts: number; items: MenuItemLite[] }>());
  const [allItems,   setAllItems]   = useState<MenuItemLite[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [open,       setOpen]       = useState(false);
  const [side,       setSide]       = useState<MenuPickSide>('targets');
  const [search,     setSearch]     = useState('');
  const [vegOnly,    setVegOnly]    = useState(false);
  const [sortKey,    setSortKey]    = useState<MenuSortKey>('recommended');
  const [visible,    setVisible]    = useState(48);

  const [targets,    setTargets]    = useState<MenuItemLite[]>([]);
  const [buyItems,   setBuyItems]   = useState<MenuItemLite[]>([]);
  const [getItems,   setGetItems]   = useState<MenuItemLite[]>([]);

  const loadMenu = useCallback(async (merchantId: string) => {
    if (!merchantId) { setAllItems([]); return; }
    const cached = cacheRef.current.get(merchantId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) { setAllItems(cached.items); return; }

    setLoading(true); setError('');
    try {
      let offset = 0; const items: MenuItemLite[] = [];
      while (true) {
        const { data, error: e } = await supabase
          .from('menu_items')
          .select('id,merchant_id,name,description,price,category,discount_percentage,image_url,is_available,is_veg,category_id')
          .eq('merchant_id', merchantId)
          .order('name')
          .range(offset, offset + 499);
        if (e) throw e;
        items.push(...(data ?? []));
        if ((data?.length ?? 0) < 500) break;
        offset += 500;
      }
      cacheRef.current.set(merchantId, { ts: Date.now(), items });
      setAllItems(items);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load menu');
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const open_picker = useCallback(async (newSide: MenuPickSide, merchantId: string) => {
    setSide(newSide);
    setSearch('');
    setVegOnly(false);
    setSortKey('recommended');
    setVisible(48);
    setOpen(true);
    await loadMenu(merchantId);
  }, [loadMenu]);

  const close_picker = useCallback(() => { setOpen(false); setSearch(''); }, []);

  const isSelected = useCallback((id: string) => {
    if (side === 'targets')  return targets.some(x => x.id === id);
    if (side === 'bxgy_buy') return buyItems.some(x => x.id === id);
    return getItems.some(x => x.id === id);
  }, [side, targets, buyItems, getItems]);

  const toggle = useCallback((it: MenuItemLite) => {
    const toggle_list = (
      prev: MenuItemLite[],
      set: React.Dispatch<React.SetStateAction<MenuItemLite[]>>
    ) => set(prev.some(x => x.id === it.id) ? prev.filter(x => x.id !== it.id) : [...prev, it]);

    if (side === 'targets')  toggle_list(targets,  setTargets);
    if (side === 'bxgy_buy') toggle_list(buyItems,  setBuyItems);
    if (side === 'bxgy_get') toggle_list(getItems,  setGetItems);
  }, [side, targets, buyItems, getItems]);

  const remove = useCallback((id: string, fromSide: MenuPickSide) => {
    if (fromSide === 'targets')  setTargets(p  => p.filter(x => x.id !== id));
    if (fromSide === 'bxgy_buy') setBuyItems(p => p.filter(x => x.id !== id));
    if (fromSide === 'bxgy_get') setGetItems(p => p.filter(x => x.id !== id));
  }, []);

  const resetAll = useCallback(() => {
    setTargets([]); setBuyItems([]); setGetItems([]);
    setOpen(false); setSearch(''); setAllItems([]);
  }, []);

  const filtered = useMemo(() => {
    let list = vegOnly ? allItems.filter(x => x.is_veg) : [...allItems];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter(x => `${x.name} ${x.description ?? ''} ${x.category ?? ''}`.toLowerCase().includes(q));
    if (sortKey === 'price_low')  list = list.sort((a, b) => a.price - b.price);
    else if (sortKey === 'price_high') list = list.sort((a, b) => b.price - a.price);
    else if (q) list = list.sort((a, b) => scoreMatch(b.name, b.description, q) - scoreMatch(a.name, a.description, q));
    else list = list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [allItems, search, vegOnly, sortKey]);

  const gridItems = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  return {
    open, side, search, vegOnly, sortKey, visible, loading, error,
    allItems, filtered, gridItems, targets, buyItems, getItems,
    setSearch, setVegOnly, setSortKey, setVisible,
    setTargets, setBuyItems, setGetItems,
    open_picker, close_picker, isSelected, toggle, remove, resetAll,
  };
}
