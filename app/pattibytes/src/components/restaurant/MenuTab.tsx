import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  LayoutAnimation,
  SectionList,
  StyleSheet,
  Text,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'
import { useRouter } from 'expo-router'
import TrendingStrip from './TrendingStrip'
import RecommendedStrip from './RecommendedStrip'
import Pressable3D from '../ui/Pressable3D'
import MenuTabToolbar from './MenuTabToolbar'
import MenuCategoryHeader from './MenuCategoryHeader'
import MenuItemCard from './MenuItemCard'
import {
  SortKey,
  MenuOffer,
  dishTimingOf,
  isDishAvailableNow,
  isFeaturedOf,
  isVegOf,
  finalPriceOf,
  merchantNameOf,
  str,
} from './menuTabShared'

interface MenuTabProps {
  merchant: any
  menuItems: any[]
  showImages: boolean
  trending: any[]
  trendingLoading: boolean
  offerByMenuItemId: Record<string, MenuOffer | null>
  onOpenTrendingItem: (t: any) => void
  onAddItem: (item: any) => void
  onInc: (item: any) => void
  onDec: (item: any) => void
  getQty: (menuItemId: string) => number
  recommended?: any[]
  recommendedLoading?: boolean
  headerSlot?: React.ReactNode
  openNow?: boolean
  onShareItem?: (item: any) => void
  onOpenItem?: (item: any) => void
  onSetQty?: (item: any, qty: number) => void
  focusItemId?: string
  refreshing?: boolean
  onRefresh?: () => void
}

type MenuSection = {
  title: string
  totalItems: number
  unavailableCount: number
  data: any[]
}

function useMinuteTick() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const now = new Date()
    const msUntilNextMinute =
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    let interval: ReturnType<typeof setInterval> | null = null

    const timeout = setTimeout(() => {
      setTick(t => t + 1)
      interval = setInterval(() => setTick(t => t + 1), 60_000)
    }, msUntilNextMinute)

    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [])

  return tick
}

function MenuTabComponent({
  merchant,
  menuItems,
  showImages,
  trending,
  trendingLoading,
  offerByMenuItemId,
  onOpenTrendingItem,
  onAddItem,
  onInc,
  onDec,
  getQty,
  recommended,
  recommendedLoading,
  openNow = true,
  onShareItem,
  onOpenItem,
  onSetQty,
  focusItemId,
  headerSlot,          // ← add this
  refreshing,
  onRefresh,
}: MenuTabProps) {
  const router = useRouter()
  const listRef = useRef<SectionList<any, MenuSection>>(null)
  const showTopRef = useRef(false)
  const tick = useMinuteTick()

  const [showTop, setShowTop] = useState(false)
  const [q, setQ] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [availNowOnly, setAvailNowOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({})

  const deferredQuery = useDeferredValue(q)

  const goFullMenu = useCallback(() => {
    router.push({
      pathname: '/(customer)/restaurant/[id]/full-menu',
      params: { id: str(merchant?.id) },
    } as any)
  }, [router, merchant?.id])

  const clearAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setQ('')
    setVegOnly(false)
    setFeaturedOnly(false)
    setAvailNowOnly(false)
    setSort('recommended')
  }, [])

  const filtered = useMemo(() => {
    void tick

    const query = deferredQuery.trim().toLowerCase()
    let list = Array.isArray(menuItems) ? menuItems.slice() : []

    if (vegOnly) list = list.filter(isVegOf)
    if (featuredOnly) list = list.filter(isFeaturedOf)
    if (availNowOnly) {
      list = list.filter(x => isDishAvailableNow(dishTimingOf(x)))
    }

    if (query) {
      list = list.filter(x => {
        const name = str(x?.name).toLowerCase()
        const desc = str(x?.description).toLowerCase()
        const cat = str(x?.category).toLowerCase()
        return (
          name.includes(query) ||
          desc.includes(query) ||
          cat.includes(query)
        )
      })
    }

    if (sort === 'name') {
      list.sort((a, b) => str(a?.name).localeCompare(str(b?.name)))
    } else if (sort === 'price_low') {
      list.sort((a, b) => finalPriceOf(a) - finalPriceOf(b))
    } else if (sort === 'price_high') {
      list.sort((a, b) => finalPriceOf(b) - finalPriceOf(a))
    }

    return list
  }, [menuItems, deferredQuery, vegOnly, featuredOnly, availNowOnly, sort, tick])

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const it of filtered) {
      const cat = str(it?.category, 'Other')
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(it)
    }
    return Array.from(map.entries())
  }, [filtered])

  const sections = useMemo<MenuSection[]>(() => {
    void tick
    return grouped.map(([title, items]) => {
      const unavailableCount = items.reduce((acc, item) => {
        const dt = dishTimingOf(item)
        return dt && !isDishAvailableNow(dt) ? acc + 1 : acc
      }, 0)

      const isOpen = openCats[title] ?? true

      return {
        title,
        totalItems: items.length,
        unavailableCount,
        data: isOpen ? items : [],
      }
    })
  }, [grouped, openCats, tick])

  const timingUnavailableCount = useMemo(() => {
    void tick
    return (menuItems ?? []).reduce((acc, item) => {
      const dt = dishTimingOf(item)
      return dt && !isDishAvailableNow(dt) ? acc + 1 : acc
    }, 0)
  }, [menuItems, tick])

  const toggleCat = useCallback((cat: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setOpenCats(prev => ({
      ...prev,
      [cat]: prev[cat] === undefined ? false : !prev[cat],
    }))
  }, [])

  const expandAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const next: Record<string, boolean> = {}
    grouped.forEach(([cat]) => {
      next[cat] = true
    })
    setOpenCats(next)
  }, [grouped])

  const collapseAll = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const next: Record<string, boolean> = {}
    grouped.forEach(([cat]) => {
      next[cat] = false
    })
    setOpenCats(next)
  }, [grouped])

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToLocation({
      sectionIndex: 0,
      itemIndex: 0,
      viewOffset: 0,
      animated: true,
    })
  }, [])

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y ?? 0
      const next = y > 420
      if (showTopRef.current !== next) {
        showTopRef.current = next
        setShowTop(next)
      }
    },
    [],
  )
  

  useEffect(() => {
    if (!focusItemId || !sections.length) return

    let sectionIndex = -1
    let itemIndex = -1
    let titleToOpen: string | null = null

    for (let s = 0; s < grouped.length; s++) {
      const [title, items] = grouped[s]
      const foundIndex = items.findIndex(it => str(it?.id) === String(focusItemId))
      if (foundIndex >= 0) {
        sectionIndex = s
        itemIndex = foundIndex
        titleToOpen = title
        break
      }
    }

    if (sectionIndex < 0 || itemIndex < 0 || !titleToOpen) return

    setOpenCats(prev => ({ ...prev, [titleToOpen]: true }))

    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({
          sectionIndex,
          itemIndex,
          animated: true,
          viewOffset: 180,
        })
      } catch {}
    }, 350)

    return () => clearTimeout(t)
  }, [focusItemId, grouped, sections.length])

  const resolveOffer = useCallback(
    (item: any): MenuOffer | null => {
      const directOffer = offerByMenuItemId?.[str(item?.id)] ?? null
      const catOffer = item?.category_id
        ? offerByMenuItemId?.[`cat:${str(item?.category_id)}`] ?? null
        : null
      const merchantOffer = offerByMenuItemId?.['merchant:all'] ?? null
      return directOffer ?? catOffer ?? merchantOffer
    },
    [offerByMenuItemId],
  )

  const renderSectionHeader = useCallback(
    ({ section }: { section: MenuSection }) => (
      <MenuCategoryHeader
        title={section.title}
        totalItems={section.totalItems}
        unavailableCount={section.unavailableCount}
        isOpen={openCats[section.title] ?? true}
        onPress={() => toggleCat(section.title)}
      />
    ),
    [openCats, toggleCat],
  )

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <MenuItemCard
        item={item}
        qty={getQty(str(item?.id))}
        showImages={showImages}
        openNow={openNow}
        offer={resolveOffer(item)}
        onAddItem={onAddItem}
        onInc={onInc}
        onDec={onDec}
        onSetQty={onSetQty}
        onOpenItem={onOpenItem}
        onShareItem={onShareItem}
      />
    ),
    [
      getQty,
      showImages,
      openNow,
      resolveOffer,
      onAddItem,
      onInc,
      onDec,
      onSetQty,
      onOpenItem,
      onShareItem,
    ],
  )

  const keyExtractor = useCallback((item: any) => str(item?.id), [])

  const listHeader = useMemo(
    () => (
      <View>
          {/* ── scrolls away with content ── */}
      {headerSlot}
        {!openNow && (
          <View style={S.closedBar}>
            <Text style={S.closedBarIcon}>🔴</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.closedBarTitle}>
                Restaurant is currently closed
              </Text>
              <Text style={S.closedBarSub}>
                You can browse the menu but cannot place orders.
              </Text>
            </View>
          </View>
        )}

        <TrendingStrip
          items={trending}
          loading={trendingLoading}
          showImages={showImages}
          onOpen={onOpenTrendingItem}
        />

        <MenuTabToolbar
          merchantName={merchantNameOf(merchant)}
          query={q}
          onChangeQuery={setQ}
          onClearQuery={() => setQ('')}
          vegOnly={vegOnly}
          featuredOnly={featuredOnly}
          availNowOnly={availNowOnly}
          timingUnavailableCount={timingUnavailableCount}
          sort={sort}
          onToggleVeg={() => setVegOnly(v => !v)}
          onToggleFeatured={() => setFeaturedOnly(v => !v)}
          onToggleAvailNow={() => setAvailNowOnly(v => !v)}
          onCycleSort={() =>
            setSort(prev =>
              prev === 'recommended'
                ? 'name'
                : prev === 'name'
                ? 'price_low'
                : prev === 'price_low'
                ? 'price_high'
                : 'recommended',
            )
          }
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onClearAll={clearAll}
          onGoFullMenu={goFullMenu}
        />
      </View>
    ),
    [
       headerSlot,
      openNow,
      trending,
      trendingLoading,
      showImages,
      onOpenTrendingItem,
      merchant,
      q,
      vegOnly,
      featuredOnly,
      availNowOnly,
      timingUnavailableCount,
      sort,
      expandAll,
      collapseAll,
      clearAll,
      goFullMenu,
    ],
  )

  const listFooter = useMemo(
    () => (
      <View style={{ paddingBottom: 24 }}>
        <RecommendedStrip
          current_merchant_id={str(merchant?.id)}
          recommended_merchants={recommended}
          recommended_merchants_loading={recommendedLoading}
          show_products={true}
        />
      </View>
    ),
    [merchant?.id, recommended, recommendedLoading],
  )

  return (
    <View style={{ flex: 1, paddingBottom: 24 }}>
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={
          <View style={S.emptyWrap}>
            <Text style={S.emptyEmoji}>🍽️</Text>
            <Text style={S.emptyTitle}>No items found</Text>
            <Text style={S.emptySub}>Try clearing search or filters.</Text>
          </View>
        }
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 96 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={32}
        windowSize={8}
        removeClippedSubviews
      />

      {showTop && (
        <View style={S.fabWrap} pointerEvents="box-none">
          <Pressable3D style={S.fab} onPress={scrollToTop}>
            <Text style={S.fabTxt}>↑ Top</Text>
          </Pressable3D>
        </View>
      )}
    </View>
  )
}

export default memo(MenuTabComponent)

const S = StyleSheet.create({
  closedBar: {
    margin: 12,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closedBarIcon: { fontSize: 22 },
  closedBarTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B',
  },
  closedBarSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B91C1C',
    marginTop: 2,
  },

  emptyWrap: {
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 8,
  },
  emptyTitle: {
    fontWeight: '800',
    color: '#111827',
  },
  emptySub: {
    color: '#6B7280',
    marginTop: 4,
  },

  fabWrap: {
    position: 'absolute',
    right: 14,
    bottom: 18,
  },
  fab: {
    backgroundColor: '#FF6B35',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fabTxt: { color: '#FFF', fontWeight: '900' },
})