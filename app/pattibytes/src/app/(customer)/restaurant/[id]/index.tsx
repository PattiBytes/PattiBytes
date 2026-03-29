/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, ActivityIndicator, StyleSheet,
  RefreshControl, ScrollView, Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { COLORS } from '../../../../../src/lib/constants';
import { isDishAvailableNow } from '../../../../../src/lib/dishTiming';
import { useRestaurantScreenData } from '../../../../../src/hooks/useRestaurantScreenData';

import RestaurantHeader  from '../../../../../src/components/restaurant/RestaurantHeader';
import RestaurantTabs, { RestaurantTabKey } from '../../../../../src/components/restaurant/RestaurantTabs';
import MenuTab           from '../../../../../src/components/restaurant/MenuTab';
import InfoTab           from '../../../../../src/components/restaurant/InfoTab';
import ReviewsTab        from '../../../../../src/components/restaurant/ReviewsTab';
import BottomCartBar     from '../../../../../src/components/restaurant/BottomCartBar';
import { useCart }       from '../../../../../src/contexts/CartContext';

function merchantNameOf(m: any): string {
  return String(m?.business_name ?? m?.businessname ?? m?.businessName ?? 'Restaurant');
}

export default function RestaurantScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    merchant, appSettings, menuItems,
    trending, trendingLoading, offerByMenuItemId,
    recommended, recommendedLoading,
    reviews, reviewItemsByReviewId,
    isFav, openNow, hasDeliveredOrder, deliveredOrderId,
    alreadyReviewed, notificationPrefs, setNotificationPref,
    loading, refreshing, refresh, toggleFavourite, submitReview,
    autoApplyBxgyPromos,   // ← new
  } = useRestaurantScreenData(String(id || ''));

  const { cart, addToCart, updateQuantity, clearCart } = useCart();
  const [activeTab, setActiveTab] = useState<RestaurantTabKey>('menu');

  // ── Memos ───────────────────────────────────────────────────────────────
  const showMenuImages = useMemo(() => {
    const v = (appSettings as any)?.show_menu_images ?? (appSettings as any)?.showmenuimages;
    return v === undefined ? true : Boolean(v);
  }, [appSettings]);

  const cartCount = useMemo(
    () => (cart?.items ?? []).reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0),
    [cart?.items],
  );

  const cartTotal = useMemo(
    () => (cart?.items ?? []).reduce((sum: number, it: any) => {
      const mrp = Number(it.price ?? 0);
      const dp  = Number(it.discount_percentage ?? 0);
      const price = dp > 0 ? mrp * (1 - dp / 100) : mrp;
      return sum + price * Number(it.quantity ?? 0);
    }, 0),
    [cart?.items],
  );

  const cartBelongsToThis = useMemo(() => {
    const merchId     = String(merchant?.id ?? '');
    const cartMerchId = String((cart as any)?.merchant_id ?? (cart as any)?.merchantid ?? '');
    return Boolean(merchId && cartMerchId && merchId === cartMerchId);
  }, [cart, merchant?.id]);

  // ── BXGY Auto-apply ─────────────────────────────────────────────────────
  const autoApplyingRef = useRef(false);

  useEffect(() => {
    if (autoApplyingRef.current) return;
    if (!autoApplyBxgyPromos?.length || !menuItems?.length || !merchant) return;
    // Only auto-apply for this restaurant's cart (or empty cart)
    if ((cart?.items?.length ?? 0) > 0 && !cartBelongsToThis) return;

    autoApplyingRef.current = true;

    try {
      for (const { promo, buyTargets, getTargets } of autoApplyBxgyPromos) {
        const deal   = promo.deal_json ?? promo.dealjson;
        if (!deal) continue;

        const buyQty  = Number(deal.buy?.qty ?? 1);
        const getQty  = Number(deal.get?.qty ?? 1);
        const maxSets = Number(deal.max_sets_per_order ?? 10);

        const buyIds = new Set(buyTargets.map((t: any) => String(t.menu_item_id ?? t.menuitemid)));
        const getIds = getTargets.map((t: any) => String(t.menu_item_id ?? t.menuitemid)).filter(Boolean);
        if (!buyIds.size || !getIds.length) continue;

        const cartItems = cart?.items ?? [];

        const buyCount = cartItems
          .filter((it: any) => buyIds.has(String(it.id)))
          .reduce((s: number, it: any) => s + Number(it.quantity ?? 0), 0);

        const possibleSets   = Math.min(Math.floor(buyCount / buyQty), maxSets);
        const totalFreeNeeded = possibleSets * getQty;

        // Use the first get-target item (customer_choice: auto picks cheapest/first)
        const getItemId  = getIds[0];
        const getMenuItem = menuItems.find((m: any) => String(m.id) === getItemId);
        if (!getMenuItem) continue;

        const inCart     = cartItems.find((it: any) => String(it.id) === getItemId);
        const currentQty = Number(inCart?.quantity ?? 0);

        if (totalFreeNeeded === currentQty) continue; // already correct — skip

        const merchId   = String(merchant.id);
        const merchName = merchantNameOf(merchant);

        if (totalFreeNeeded === 0) {
          // Remove the free item entirely
          updateQuantity?.(getItemId, 0);
        } else if (currentQty === 0) {
          // Auto-add as free item
          addToCart?.(
            {
              id:                  String(getMenuItem.id),
              name:                `${getMenuItem.name ?? ''} (🎁 FREE)`,
              price:               Number(getMenuItem.price ?? 0),
              quantity:            totalFreeNeeded,
              image_url:           getMenuItem.image_url ?? getMenuItem.image_url ?? null,
              discount_percentage: 100,   // → effective price = ₹0
              is_veg:              getMenuItem.is_veg ?? getMenuItem.is_veg ?? null,
              category:            getMenuItem.category ?? null,
              merchant_id:         String(merchant.id),
            },
            merchId,
            merchName,
          );
        } else {
          // Adjust quantity of existing free item
          updateQuantity?.(getItemId, totalFreeNeeded);
        }
      }
    } finally {
      setTimeout(() => { autoApplyingRef.current = false; }, 600);
    }
  }, [cart?.items, autoApplyBxgyPromos, menuItems, merchant, cartBelongsToThis]);

  // ── Guards ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={S.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!merchant) {
    return (
      <View style={S.center}>
        <Stack.Screen options={{ title: 'Restaurant' }} />
      </View>
    );
  }

  // ── Cart helpers ─────────────────────────────────────────────────────────
  const getQty = (menuItemId: string): number => {
    const found = (cart?.items ?? []).find((x: any) => String(x.id) === String(menuItemId));
    return Number(found?.quantity ?? 0);
  };

  const toCartItem = (item: any, quantity = 1) => ({
    id:                  String(item.id),
    name:                String(item.name ?? ''),
    price:               Number(item.price ?? 0),
    quantity,
    image_url:           item.image_url ?? null,
    discount_percentage: Number(item.discount_percentage ?? 0) || 0,
    is_veg:              item.is_veg ?? null,
    category:            item.category ?? null,
    merchant_id:         String(merchant.id),
  });

  const handleAddOrInc = async (item: any) => {
    // ── Guard: restaurant closed ──────────────────────────────────────────
    if (!openNow) {
      Alert.alert(
        'Restaurant Closed',
        'This restaurant is currently closed. Please check back during opening hours.',
        [{ text: 'OK' }],
      );
      return;
    }

    // ── Guard: dish not in its time window ────────────────────────────────
    if (!isDishAvailableNow(item.dish_timing)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { formatDishTiming } = require('../../../../../src/lib/dishTiming');
      const window = formatDishTiming(item.dish_timing);
      Alert.alert(
        'Not Available Now',
        window
          ? `"${item.name}" is only available ${window}.`
          : `"${item.name}" is not available at this time.`,
        [{ text: 'OK' }],
      );
      return;
    }

    const currentQty     = getQty(String(item.id));
    const merchId        = String(merchant.id);
    const merchName      = merchantNameOf(merchant);
    const cartMerchantId = String((cart as any)?.merchant_id ?? (cart as any)?.merchantid ?? '');
    const cartHasItems   = (cart?.items?.length ?? 0) > 0;

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
              await clearCart?.();
              addToCart?.(toCartItem(item, 1), merchId, merchName);
            },
          },
        ],
      );
      return;
    }

    if (currentQty <= 0) {
      addToCart?.(toCartItem(item, 1), merchId, merchName);
    } else {
      updateQuantity?.(String(item.id), currentQty + 1);
    }
  };

  const handleDec = (item: any) => {
    const qty = getQty(String(item.id));
    updateQuantity?.(String(item.id), Math.max(0, qty - 1));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={S.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.primary} />
        }
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: 220 }}
      >
        <RestaurantHeader
          merchant={merchant}
          openNow={openNow}
          isFav={isFav}
          cartCount={cartCount}
          onBack={() => router.back()}
          onToggleFav={toggleFavourite}
          onShare={() => {}}
          onGoCart={() => router.push('/(customer)/cart' as any)}
        />

        <RestaurantTabs
          active={activeTab}
          onChange={setActiveTab}
          reviewsCount={reviews.length}
        />

        {activeTab === 'menu' && (
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
            onOpenTrendingItem={() => {}}
            openNow={openNow}              // ← new
          />
        )}

        {activeTab === 'info' && <InfoTab merchant={merchant} />}

        {activeTab === 'reviews' && (
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
        )}
      </ScrollView>

      <BottomCartBar
        visible={cartBelongsToThis && cartCount > 0}
        itemCount={cartCount}
        total={cartTotal}
        onGoCart={() => router.push('/(customer)/cart' as any)}
        onClear={() => clearCart?.()}
      />
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
});
