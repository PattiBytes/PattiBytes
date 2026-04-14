/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  RefreshControl,
  Share,
  StyleSheet,
  View,
} from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { COLORS } from '../../../../lib/constants'
import { isDishAvailableNow, formatDishTiming } from '../../../../lib/dishTiming'
import { useRestaurantScreenData } from '../../../../hooks/useRestaurantScreenData'
import RestaurantHeader       from '../../../../components/restaurant/RestaurantHeader'
import RestaurantTabs, { RestaurantTabKey } from '../../../../components/restaurant/RestaurantTabs'
import MenuTab                from '../../../../components/restaurant/MenuTab'
import InfoTab                from '../../../../components/restaurant/InfoTab'
import ReviewsTab             from '../../../../components/restaurant/ReviewsTab'
import BottomCartBar          from '../../../../components/restaurant/BottomCartBar'
import { useCart }            from '../../../../contexts/CartContext'
import { MenuTabErrorBoundary } from '../../../../components/restaurant/MenuTabErrorBoundary'
import ItemDetailsSheet       from '../../../../components/restaurant/ItemDetailsSheet'
import { finalPriceOf } from '@/components/restaurant/menuTabShared'

const { width: SW } = Dimensions.get('window')

function merchantNameOf(m: any): string {
  return String(m?.business_name ?? m?.businessname ?? m?.businessName ?? 'Restaurant')
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function RestaurantSkeleton() {
  const anim = useRef(new Animated.Value(0.6)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [anim])

  const Box = ({ style }: { style: any }) => (
    <Animated.View style={[SK.box, style, { opacity: anim }]} />
  )

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Box style={{ width: SW, height: 200, borderRadius: 0 }} />
      <View style={SK.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Box style={{ width: 68, height: 68, borderRadius: 34 }} />
          <View style={{ flex: 1, gap: 9 }}>
            <Box style={{ height: 18, width: '65%' }} />
            <Box style={{ height: 13, width: '45%' }} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          {[72, 88, 64].map((w, i) => <Box key={i} style={{ height: 30, width: w, borderRadius: 20 }} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[1, 1, 1].map((_, i) => <Box key={i} style={{ height: 40, flex: 1, borderRadius: 12 }} />)}
        </View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10 }}>
        <Box style={{ height: 16, width: '40%' }} />
      </View>
      {[0, 1, 2, 3, 4].map(i => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, marginBottom: 18 }}>
          <Box style={{ width: 88, height: 88, borderRadius: 14 }} />
          <View style={{ flex: 1, gap: 9 }}>
            <Box style={{ height: 14, width: '70%' }} />
            <Box style={{ height: 12, width: '50%' }} />
            <Box style={{ height: 17, width: '32%' }} />
          </View>
          <Box style={{ width: 64, height: 36, borderRadius: 12 }} />
        </View>
      ))}
    </View>
  )
}

const SK = StyleSheet.create({
  box:  { backgroundColor: '#E5E7EB', borderRadius: 8 },
  card: { backgroundColor: '#FFF', marginTop: -20, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
})

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RestaurantScreen() {
  const router = useRouter()
  const { id, focusItemId } = useLocalSearchParams<{ id: string; focusItemId?: string }>()

  const {
    merchant, appSettings, menuItems, trending, trendingLoading,
    offerByMenuItemId, recommended, recommendedLoading,
    reviews, reviewItemsByReviewId, isFav, openNow,
    hasDeliveredOrder, deliveredOrderId, alreadyReviewed,
    notificationPrefs, setNotificationPref,
    loading, refreshing, refresh,
    toggleFavourite, submitReview, autoApplyBxgyPromos,
  } = useRestaurantScreenData(String(id))

  const { cart, addToCart, updateQuantity, clearCart } = useCart()
  const [activeTab,   setActiveTab]   = useState<RestaurantTabKey>('menu')
  const [detailsItem, setDetailsItem] = useState<any | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────
  const showMenuImages = useMemo(() => {
    const v = (appSettings as any)?.show_menu_images ?? (appSettings as any)?.showmenuimages
    return v === undefined ? true : Boolean(v)
  }, [appSettings])

  const cartCount = useMemo(
    () => (cart?.items ?? []).reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0),
    [cart?.items],
  )

  const cartTotal = useMemo(
    () => (cart?.items ?? []).reduce((sum: number, it: any) => {
      const mrp = Number(it.price ?? 0)
      const dp  = Number(it.discount_percentage ?? it.discountpercentage ?? 0)
      return sum + (dp > 0 ? mrp * (1 - dp / 100) : mrp) * Number(it.quantity ?? 0)
    }, 0),
    [cart?.items],
  )

  const cartBelongsToThis = useMemo(() => {
    const merchId     = String(merchant?.id ?? '')
    const cartMerchId = String((cart as any)?.merchant_id ?? (cart as any)?.merchantid ?? '')
    return Boolean(merchId && cartMerchId === merchId)
  }, [cart, merchant?.id])

  // ── BXGY auto-apply ────────────────────────────────────────────────────────
  const autoApplyingRef = useRef(false)
  useEffect(() => {
    if (autoApplyingRef.current) return
    if (!autoApplyBxgyPromos?.length || !menuItems?.length || !merchant) return
    if ((cart?.items?.length ?? 0) > 0 && !cartBelongsToThis) return

    autoApplyingRef.current = true
    try {
      for (const { promo, buy_targets, get_targets } of autoApplyBxgyPromos) {
        const deal = promo.deal_json ?? promo.dealjson
        if (!deal) continue

        const buyQty  = Number(deal.buy?.qty ?? 1)
        const getQty  = Number(deal.get?.qty ?? 1)
        const maxSets = Number(deal.max_sets_per_order ?? deal.maxsetsperorder ?? 10)

        const buyIds = new Set(buy_targets.map((t: any) => String(t.menu_item_id ?? t.menuitemid)))
        const getIds = get_targets.map((t: any) => String(t.menu_item_id ?? t.menuitemid)).filter(Boolean)
        if (!buyIds.size || !getIds.length) continue

        const cartItems       = cart?.items ?? []
        const buyCount        = cartItems
          .filter((it: any) => buyIds.has(String(it.id)))
          .reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0)
        const possibleSets    = Math.min(Math.floor(buyCount / buyQty), maxSets)
        const totalFreeNeeded = possibleSets * getQty
        const getItemId       = getIds[0]
        const getMenuItem     = menuItems.find((m: any) => String(m.id) === getItemId)
        if (!getMenuItem) continue

        const inCart     = cartItems.find((it: any) => String(it.id) === getItemId)
        const currentQty = Number(inCart?.quantity ?? 0)
        if (totalFreeNeeded === currentQty) continue

        const merchId   = String(merchant.id)
        const merchName = merchantNameOf(merchant)

        if (totalFreeNeeded === 0) {
          updateQuantity?.(getItemId, 0)
        } else if (currentQty === 0) {
          addToCart?.(
            {
              id:                  String(getMenuItem.id),
              name:                (getMenuItem as any).name ?? 'FREE',
              price:               Number((getMenuItem as any).price ?? 0),
              quantity:            totalFreeNeeded,
              image_url:           (getMenuItem as any).image_url ?? (getMenuItem as any).imageurl ?? null,
              discount_percentage: 100,
              is_veg:              (getMenuItem as any).is_veg ?? (getMenuItem as any).isveg ?? null,
              category:            (getMenuItem as any).category ?? null,
              merchant_id:         String(merchant.id),
            },
            merchId,
            merchName,
          )
        } else {
          updateQuantity?.(getItemId, totalFreeNeeded)
        }
      }
    } finally {
      setTimeout(() => { autoApplyingRef.current = false }, 600)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.items, autoApplyBxgyPromos, menuItems, merchant, cartBelongsToThis])

  // ── Skeleton ───────────────────────────────────────────────────────────────
  if (loading) return <RestaurantSkeleton />

  if (!merchant) {
    return (
      <View style={S.center}>
        <Stack.Screen options={{ headerShown: false }} />
      </View>
    )
  }

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const getQty = (menuItemId: string): number => {
    const found = (cart?.items ?? []).find((x: any) => String(x.id) === String(menuItemId))
    return Number(found?.quantity ?? 0)
  }

  const toCartItem = (item: any, quantity = 1) => ({
    id:                  String(item.id),
    name:                String(item.name ?? ''),
    price:               Number(item.price ?? 0),
    quantity,
    image_url:           item.image_url ?? item.imageurl ?? null,
    discount_percentage: Number(item.discount_percentage ?? item.discountpercentage ?? 0) > 0
      ? Number(item.discount_percentage ?? item.discountpercentage ?? 0)
      : 0,
    is_veg:      item.is_veg ?? item.isveg ?? null,
    category:    item.category ?? null,
    merchant_id: String(merchant.id),
  })

  const setQtyExplicit = (item: any, qty: number) =>
    updateQuantity?.(String(item.id), Math.max(0, Math.floor(qty)))

  const handleAddOrInc = async (item: any) => {
    if (!openNow) {
      Alert.alert('Restaurant Closed', 'This restaurant is currently closed.', [{ text: 'OK' }])
      return
    }
    const timing = item.dish_timing ?? item.dishtiming
    if (!isDishAvailableNow(timing)) {
      const windowLabel = formatDishTiming(timing)
      Alert.alert(
        'Not Available Now',
        windowLabel
          ? `${item.name} is only available ${windowLabel}.`
          : `${item.name} is not available at this time.`,
        [{ text: 'OK' }],
      )
      return
    }
    const currentQty     = getQty(String(item.id))
    const merchId        = String(merchant.id)
    const merchName      = merchantNameOf(merchant)
    const cartMerchantId = String((cart as any)?.merchant_id ?? (cart as any)?.merchantid ?? '')
    const cartHasItems   = (cart?.items?.length ?? 0) > 0

    if (cartMerchantId && cartMerchantId !== merchId && cartHasItems) {
      Alert.alert(
        'Different restaurant',
        'Your cart has items from another restaurant. Clear cart and add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add',
            style: 'destructive',
            onPress: async () => {
              await clearCart?.()
              addToCart?.(toCartItem(item, 1), merchId, merchName)
            },
          },
        ],
      )
      return
    }

    if (currentQty === 0) addToCart?.(toCartItem(item, 1), merchId, merchName)
    else updateQuantity?.(String(item.id), currentQty + 1)
  }

  const handleDec = (item: any) => {
    const qty = getQty(String(item.id))
    updateQuantity?.(String(item.id), Math.max(0, qty - 1))
  }

  // ── Share ──────────────────────────────────────────────────────────────────
const handleShareItem = async (item: any) => {
  try {
    const isRestaurant = typeof item?.id !== 'undefined' && item?.name   // dish
      ? true : false

    const dishName  = String(item?.name ?? 'Check this out')
    const price     = finalPriceOf(item)
    const rest      = merchantNameOf(merchant)

    // Single canonical link that works everywhere:
    // • Opens app if installed (App Links / Universal Links)
    // • Falls back to correct store page if not installed
    // • WhatsApp / Telegram render it as a tap-able preview card
    const appLink = Platform.OS === 'ios'
      ? 'https://apps.apple.com/us/app/pattibytes-express/id6761598840'
      : 'https://play.google.com/store/apps/details?id=com.pattibytes.express'

    // ⚠️  WhatsApp link-preview rules:
    //   1. URL must start with https://
    //   2. URL must be on its OWN line — no text before or after on that line
    //   3. A blank line before the URL triggers the large preview card
    const lines = [
      `🍽️ *${dishName}* — ₹${price.toFixed(0)}`,
      `📍 ${rest} on PattiBytes Express`,
      ``,                    // blank line → WhatsApp shows big preview card
      appLink,               // ← own line, nothing else → detected as link ✅
    ]

    const message = lines.join('\n')

    await Share.share(
      {
        message,             // Android uses `message` — `url` is ignored
        url: appLink,        // iOS uses `url` for the system share card
        title: `${dishName} · PattiBytes`,
      },
      {
        dialogTitle: `Share "${dishName}"`,   // Android bottom-sheet title
        subject:     `${dishName} on PattiBytes Express`,
      },
    )
  } catch (e: any) {
    // "User did not share" is a normal cancel — don't alert
    if (e?.message !== 'User did not share') {
      Alert.alert('Share', e?.message ?? 'Could not share right now.')
    }
  }
}

  // ── Render ─────────────────────────────────────────────────────────────────
  // ⚠️ No ScrollView wrapper — MenuTab has its own SectionList.
  // Wrapping a VirtualizedList inside a ScrollView disables windowing and
  // causes "VirtualizedLists should never be nested" warning + severe jank.
 // ── Render ─────────────────────────────────────────────────────────────────
// Header + Tabs are no longer fixed — they scroll with each tab's content.
return (
  <View style={S.container}>
    <Stack.Screen options={{ headerShown: false }} />

    {/* Shared header node — passed into each tab as a scrollable slot */}
    {(() => {
      const headerNode = (
        <>
          <RestaurantHeader
            merchant={merchant}
            openNow={openNow}
            isFav={isFav}
            cartCount={cartCount}
            onBack={() => router.back()}
            onToggleFav={toggleFavourite}
            onShare={() => handleShareItem(merchant)}
            onGoCart={() => router.push('/(customer)/cart' as any)}
          />
          <RestaurantTabs
            active={activeTab}
            onChange={setActiveTab}
            reviewsCount={reviews.length}
          />
        </>
      )

      function handleOpenItem(t: any): void {
        throw new Error('Function not implemented.')
      }

      return (
        <>
          {activeTab === 'menu' && (
            <MenuTabErrorBoundary>
              <MenuTab
                merchant={merchant}
                menuItems={menuItems}
                showImages={showMenuImages}
                trending={trending}
                trendingLoading={trendingLoading}
                offerByMenuItemId={offerByMenuItemId}
                onAddItem={handleAddOrInc}
                onInc={handleAddOrInc}
                onDec={handleDec}
                getQty={getQty}
                onOpenTrendingItem={handleOpenItem}
                openNow={openNow}
                onShareItem={handleShareItem}
                onOpenItem={handleOpenItem}
                onSetQty={setQtyExplicit}
                focusItemId={focusItemId ? String(focusItemId) : undefined}
                recommended={recommended}
                recommendedLoading={recommendedLoading}
                refreshing={refreshing}
                onRefresh={refresh}
                headerSlot={headerNode}
              />
            </MenuTabErrorBoundary>
          )}

          {activeTab === 'info' && (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={COLORS.primary}
                />
              }
            >
              {headerNode}
              <InfoTab merchant={merchant} />
            </ScrollView>
          )}

          {activeTab === 'reviews' && (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={COLORS.primary}
                />
              }
            >
              {headerNode}
              <ReviewsTab
                merchant={merchant}
                reviews={reviews}
                reviewItemsByReviewId={reviewItemsByReviewId}
                hasDeliveredOrder={hasDeliveredOrder}
                deliveredOrderId={deliveredOrderId}
                alreadyReviewed={alreadyReviewed}
                notificationEnabled={
                  notificationPrefs?.review_updates === undefined
                    ? true
                    : Boolean(notificationPrefs.review_updates)
                }
                onToggleNotification={v => setNotificationPref('review_updates', v)}
                onSubmitReview={submitReview}
              />
            </ScrollView>
          )}
        </>
      )
    })()}

    {/* ── Overlays (always above scroll) ── */}
    <ItemDetailsSheet
      visible={!!detailsItem}
      item={detailsItem}
      merchantName={merchantNameOf(merchant)}
      qty={detailsItem ? getQty(String(detailsItem.id)) : 0}
      onClose={() => setDetailsItem(null)}
      onAdd={handleAddOrInc}
    />

    <BottomCartBar
      visible={cartBelongsToThis && cartCount > 0}
      itemCount={cartCount}
      total={cartTotal}
      onGoCart={() => router.push('/(customer)/cart' as any)}
      onClear={clearCart}
    />
  </View>
)
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
})