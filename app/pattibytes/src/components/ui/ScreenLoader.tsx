// src/components/ui/ScreenLoader.tsx
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS } from '../../lib/constants'
import { SkeletonBox } from './SkeletonBox'

export type LoaderVariant =
  | 'fullscreen'
  | 'dashboard'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'orderDetail'
  | 'offers'

interface Props {
  variant?: LoaderVariant
}

export function ScreenLoader({ variant = 'fullscreen' }: Props) {
  const insets    = useSafeAreaInsets()
  const topPad    = Math.max(insets.top, 44)

  switch (variant) {
    case 'dashboard':   return <DashboardSkeleton    topPad={topPad} />
    case 'cart':        return <CartSkeleton         topPad={topPad} />
    case 'checkout':    return <CheckoutSkeleton     topPad={topPad} />
    case 'orders':      return <OrdersSkeleton       topPad={topPad} />
    case 'orderDetail': return <OrderDetailSkeleton  topPad={topPad} />
    case 'offers':      return <OffersSkeleton       topPad={topPad} />
    default:            return <FullscreenLoader />
  }
}

// ─── Fullscreen spinner ───────────────────────────────────────────────────────
function FullscreenLoader() {
  return (
    <View style={S.fullscreen}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={S.page}>
      {/* Header */}
      <View style={[S.primaryBar, { paddingTop: topPad, paddingBottom: 14, paddingHorizontal: 16 }]}>
        <View style={S.row}>
          <View style={{ flex: 1 }}>
            <SkeletonBox height={11} width="45%" borderRadius={5} style={S.whiteSkel25} />
            <SkeletonBox height={18} width="65%" borderRadius={5} style={[S.whiteSkel35, { marginTop: 6 }]} />
          </View>
          <SkeletonBox height={38} width={38} borderRadius={19} style={S.whiteSkel25} />
        </View>
        <SkeletonBox height={44} borderRadius={14} style={[S.whiteSkel30, { marginTop: 12 }]} />
      </View>

      {/* Quick action icons */}
      <View style={[S.row, { paddingHorizontal: 16, marginTop: 16, gap: 10 }]}>
        {[1, 2, 3, 4].map(k => (
          <View key={k} style={{ flex: 1, alignItems: 'center' }}>
            <SkeletonBox height={52} width={52} borderRadius={26} />
            <SkeletonBox height={10} width={44} borderRadius={5} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Category chips */}
      <View style={[S.row, { paddingHorizontal: 16, marginTop: 16, gap: 8 }]}>
        {[90, 80, 110, 90].map((w, k) => (
          <SkeletonBox key={k} height={32} width={w} borderRadius={999} />
        ))}
      </View>

      {/* Restaurant cards */}
      {[1, 2, 3].map(k => (
        <View key={k} style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' }]}>
          <SkeletonBox height={140} borderRadius={0} />
          <View style={{ padding: 12 }}>
            <SkeletonBox height={16} width="70%" borderRadius={6} />
            <SkeletonBox height={11} width="45%" borderRadius={5} style={{ marginTop: 6 }} />
            <View style={[S.row, { marginTop: 8, gap: 8 }]}>
              <SkeletonBox height={22} width={60} borderRadius={999} />
              <SkeletonBox height={22} width={70} borderRadius={999} />
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
function CartSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={S.page}>
      {/* Merchant banner (sits below nav header) */}
      <View style={[S.primaryBar, { paddingTop: topPad + 56, paddingHorizontal: 16, paddingBottom: 14 }]}>
        <SkeletonBox height={20} width="55%" borderRadius={6} style={S.whiteSkel35} />
        <SkeletonBox height={11} width="40%" borderRadius={5} style={[S.whiteSkel25, { marginTop: 6 }]} />
      </View>

      {/* Items */}
      {[1, 2, 3].map(k => (
        <View key={k} style={[S.surface, S.itemRow]}>
          <SkeletonBox height={56} width={56} borderRadius={12} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonBox height={14} width="70%" borderRadius={5} />
            <SkeletonBox height={11} width="40%" borderRadius={5} style={{ marginTop: 6 }} />
          </View>
          <SkeletonBox height={32} width={84} borderRadius={999} />
        </View>
      ))}

      {/* Address card */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        <SkeletonBox height={13} width="35%" borderRadius={5} />
        <SkeletonBox height={11} width="75%" borderRadius={5} style={{ marginTop: 8 }} />
        <SkeletonBox height={11} width="55%" borderRadius={5} style={{ marginTop: 5 }} />
      </View>

      {/* Bill rows */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        <SkeletonBox height={13} width="30%" borderRadius={5} />
        {[1, 2, 3, 4].map(k => (
          <View key={k} style={[S.spaceBetween, { marginTop: 10 }]}>
            <SkeletonBox height={11} width="45%" borderRadius={5} />
            <SkeletonBox height={11} width={60} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
function CheckoutSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={S.page}>
      <View style={[S.primaryBar, { paddingTop: topPad + 56, paddingHorizontal: 16, paddingBottom: 14 }]}>
        <SkeletonBox height={18} width="40%" borderRadius={6} style={S.whiteSkel35} />
      </View>

      {/* Address */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        <SkeletonBox height={13} width="40%" borderRadius={5} />
        <SkeletonBox height={11} width="80%" borderRadius={5} style={{ marginTop: 8 }} />
        <SkeletonBox height={11} width="60%" borderRadius={5} style={{ marginTop: 5 }} />
      </View>

      {/* Items */}
      {[1, 2].map(k => (
        <View key={k} style={[S.surface, S.itemRow]}>
          <SkeletonBox height={48} width={48} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <SkeletonBox height={13} width="65%" borderRadius={5} />
            <SkeletonBox height={11} width="35%" borderRadius={5} style={{ marginTop: 5 }} />
          </View>
          <SkeletonBox height={13} width={50} borderRadius={5} />
        </View>
      ))}

      {/* Payment */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        <SkeletonBox height={13} width="35%" borderRadius={5} />
        <View style={[S.row, { marginTop: 10, gap: 8 }]}>
          {[1, 2, 3].map(k => (
            <SkeletonBox key={k} height={40} width={80} borderRadius={10} />
          ))}
        </View>
      </View>

      {/* Bill */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        {[1, 2, 3, 4].map(k => (
          <View key={k} style={[S.spaceBetween, { marginTop: k === 1 ? 0 : 10 }]}>
            <SkeletonBox height={11} width="45%" borderRadius={5} />
            <SkeletonBox height={11} width={60} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Orders list ──────────────────────────────────────────────────────────────
function OrdersSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={S.page}>
      <View style={[S.primaryBar, { paddingTop: topPad + 56, paddingHorizontal: 16, paddingBottom: 14 }]}>
        <SkeletonBox height={18} width="40%" borderRadius={6} style={S.whiteSkel35} />
      </View>

      {/* Tabs */}
      <View style={[S.row, { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }]}>
        {[48, 40, 54, 44].map((w, k) => (
          <View key={k} style={{ flex: 1, paddingVertical: 12, alignItems: 'center' }}>
            <SkeletonBox height={11} width={w} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Order cards */}
      {[1, 2, 3, 4].map(k => (
        <View key={k} style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14 }]}>
          <View style={S.spaceBetween}>
            <View style={S.row}>
              <SkeletonBox height={44} width={44} borderRadius={22} />
              <View style={{ marginLeft: 10 }}>
                <SkeletonBox height={14} width={120} borderRadius={5} />
                <SkeletonBox height={11} width={80} borderRadius={5} style={{ marginTop: 5 }} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <SkeletonBox height={13} width={60} borderRadius={5} />
              <SkeletonBox height={24} width={72} borderRadius={999} style={{ marginTop: 6 }} />
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#F3F4F6', marginVertical: 10 }} />
          <View style={S.spaceBetween}>
            <SkeletonBox height={11} width={90} borderRadius={5} />
            <SkeletonBox height={30} width={80} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Order detail ─────────────────────────────────────────────────────────────
function OrderDetailSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={S.page}>
      {/* Status hero */}
      <View style={[S.primaryBar, { paddingTop: topPad + 56, paddingHorizontal: 16, paddingBottom: 24, alignItems: 'center' }]}>
        <SkeletonBox height={52} width={52} borderRadius={26} style={S.whiteSkel30} />
        <SkeletonBox height={18} width="45%" borderRadius={6} style={[S.whiteSkel35, { marginTop: 10 }]} />
        <SkeletonBox height={11} width="60%" borderRadius={5} style={[S.whiteSkel25, { marginTop: 8 }]} />
      </View>

      {/* Timeline */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        {[1, 2, 3, 4].map(k => (
          <View key={k} style={[S.row, { marginBottom: k < 4 ? 16 : 0 }]}>
            <SkeletonBox height={28} width={28} borderRadius={14} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <SkeletonBox height={13} width="60%" borderRadius={5} />
              <SkeletonBox height={10} width="40%" borderRadius={5} style={{ marginTop: 5 }} />
            </View>
          </View>
        ))}
      </View>

      {/* Items */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        <SkeletonBox height={13} width="30%" borderRadius={5} />
        {[1, 2].map(k => (
          <View key={k} style={[S.row, { marginTop: 12 }]}>
            <SkeletonBox height={40} width={40} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <SkeletonBox height={13} width="65%" borderRadius={5} />
              <SkeletonBox height={10} width="35%" borderRadius={5} style={{ marginTop: 5 }} />
            </View>
            <SkeletonBox height={13} width={50} borderRadius={5} />
          </View>
        ))}
      </View>

      {/* Bill */}
      <View style={[S.surface, { marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 }]}>
        {[1, 2, 3].map(k => (
          <View key={k} style={[S.spaceBetween, { marginTop: k === 1 ? 0 : 10 }]}>
            <SkeletonBox height={11} width="45%" borderRadius={5} />
            <SkeletonBox height={11} width={60} borderRadius={5} />
          </View>
        ))}
      </View>
    </View>
  )
}

// ─── Offers ───────────────────────────────────────────────────────────────────
function OffersSkeleton({ topPad }: { topPad: number }) {
  return (
    <View style={[S.page, { backgroundColor: '#F3F4F6' }]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: topPad + 14, paddingBottom: 6 }}>
        <SkeletonBox height={22} width="55%" borderRadius={6} />
        <SkeletonBox height={11} width="35%" borderRadius={5} style={{ marginTop: 6 }} />
      </View>

      {/* Search bar */}
      <SkeletonBox
        height={44}
        borderRadius={14}
        style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 10 }}
      />

      {/* Category chips */}
      <View style={[S.row, { paddingHorizontal: 16, marginBottom: 12, gap: 8, flexWrap: 'nowrap' }]}>
        {[90, 80, 60, 100].map((w, k) => (
          <SkeletonBox key={k} height={34} width={w} borderRadius={999} />
        ))}
      </View>

      {/* Promo cards — mirror the real card structure */}
      {[1, 2, 3].map(k => (
        <View
          key={k}
          style={[
            S.surface,
            { marginHorizontal: 16, marginTop: 12, borderRadius: 18, overflow: 'hidden' },
          ]}
        >
          {/* Coloured header area */}
          <SkeletonBox height={72} borderRadius={0} style={{ backgroundColor: '#D1D5DB' }} />

          {/* Code row */}
          <View style={[S.row, { paddingHorizontal: 14, paddingVertical: 10, gap: 8 }]}>
            <SkeletonBox height={36} borderRadius={10} style={{ flex: 1 }} />
            <SkeletonBox height={36} width={72} borderRadius={10} />
          </View>

          {/* Meta pills */}
          <View style={[S.row, { paddingHorizontal: 14, paddingBottom: 12, gap: 6 }]}>
            <SkeletonBox height={24} width={80} borderRadius={999} />
            <SkeletonBox height={24} width={70} borderRadius={999} />
            <SkeletonBox height={24} width={90} borderRadius={999} />
          </View>
        </View>
      ))}
    </View>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:         { flex: 1, backgroundColor: '#F8F9FA' },
  fullscreen:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F9FA' },
  primaryBar:   { backgroundColor: COLORS.primary },
  surface:      { backgroundColor: '#fff' },
  row:          { flexDirection: 'row', alignItems: 'center' },
  spaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemRow:      {
    marginHorizontal: 16, marginTop: 8, borderRadius: 12, padding: 12,
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
  },
  // Skeleton tints for use on the coloured header bar
  whiteSkel25: { backgroundColor: 'rgba(255,255,255,0.25)' },
  whiteSkel30: { backgroundColor: 'rgba(255,255,255,0.30)' },
  whiteSkel35: { backgroundColor: 'rgba(255,255,255,0.35)' },
})