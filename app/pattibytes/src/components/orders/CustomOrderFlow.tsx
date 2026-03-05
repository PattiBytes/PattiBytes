import React, { useState, useRef } from 'react'
import {
  View, Text, Image, ScrollView, FlatList,
  TouchableOpacity, StyleSheet, Modal,
  Dimensions, Animated, SafeAreaView, StatusBar,
} from 'react-native'
import type { OrderDetail } from './types'

const { width: SW, height: SH } = Dimensions.get('window')

// ── Constants ─────────────────────────────────────────────────────────────────
const CUSTOM_STEPS = [
  { key: 'pending',    emoji: '📝', label: 'Received',   desc: 'Request submitted'     },
  { key: 'reviewing',  emoji: '🔍', label: 'Reviewing',  desc: 'Team is reviewing'     },
  { key: 'quoted',     emoji: '💬', label: 'Quoted',     desc: 'Quote ready for you'   },
  { key: 'confirmed',  emoji: '✅', label: 'Confirmed',  desc: 'You accepted quote'    },
  { key: 'preparing',  emoji: '📦', label: 'Packing',    desc: 'Items being packed'    },
  { key: 'dispatched', emoji: '🚚', label: 'Dispatched', desc: 'Out for delivery'      },
  { key: 'delivered',  emoji: '🎉', label: 'Delivered',  desc: 'Order complete'        },
]

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  dairy:      { bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:    { bg: '#D1FAE5', text: '#065F46' },
  medicines:  { bg: '#FEE2E2', text: '#991B1B' },
  food:       { bg: '#FEF3C7', text: '#92400E' },
  bakery:     { bg: '#FCE7F3', text: '#9D174D' },
  stationery: { bg: '#EDE9FE', text: '#5B21B6' },
  other:      { bg: '#F3F4F6', text: '#374151' },
}
const CAT_EMOJI: Record<string, string> = {
  dairy: '🥛', grocery: '🛒', medicines: '💊',
  food: '🍱', bakery: '🎂', stationery: '✏️', other: '📦',
}

// ── Image helpers ─────────────────────────────────────────────────────────────
function parseImages(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.filter(Boolean)
  } catch { /* not JSON */ }
  return typeof raw === 'string' ? [raw] : []
}

// ── Shared Lightbox ───────────────────────────────────────────────────────────
function ImageLightbox({
  images, startIndex, visible, onClose,
}: {
  images: string[]; startIndex: number; visible: boolean; onClose: () => void
}) {
  const [current, setCurrent] = useState(startIndex)
  const flatRef               = useRef<FlatList>(null)
  const fadeAnim              = useRef(new Animated.Value(0)).current

  React.useEffect(() => {
    if (visible) {
      setCurrent(startIndex)
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      setTimeout(() => flatRef.current?.scrollToIndex({ index: startIndex, animated: false }), 50)
    } else {
      fadeAnim.setValue(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, startIndex])

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= images.length) return
    setCurrent(idx)
    flatRef.current?.scrollToIndex({ index: idx, animated: true })
  }

  if (!visible) return null

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar hidden />
      <Animated.View style={[LB.overlay, { opacity: fadeAnim }]}>
        <SafeAreaView style={{ flex: 1 }}>

          {/* Top bar */}
          <View style={LB.topBar}>
            <View style={LB.counterPill}>
              <Text style={LB.counterTxt}>{current + 1} / {images.length}</Text>
            </View>
            <TouchableOpacity style={LB.closeBtn} onPress={onClose}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Main image pager */}
          <FlatList
            ref={flatRef}
            data={images}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
            onMomentumScrollEnd={e => {
              setCurrent(Math.round(e.nativeEvent.contentOffset.x / SW))
            }}
            renderItem={({ item }) => (
              <View style={LB.slide}>
                <Image source={{ uri: item }} style={LB.fullImg} resizeMode="contain" />
              </View>
            )}
          />

          {/* Prev / Next arrows */}
          {current > 0 && (
            <TouchableOpacity style={[LB.arrow, LB.arrowL]} onPress={() => goTo(current - 1)}>
              <Text style={LB.arrowTxt}>‹</Text>
            </TouchableOpacity>
          )}
          {current < images.length - 1 && (
            <TouchableOpacity style={[LB.arrow, LB.arrowR]} onPress={() => goTo(current + 1)}>
              <Text style={LB.arrowTxt}>›</Text>
            </TouchableOpacity>
          )}

          {/* Dot indicators */}
          {images.length > 1 && (
            <View style={LB.dotsRow}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goTo(i)}>
                  <View style={[LB.dot, i === current && LB.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={LB.thumbStrip}
            >
              {images.map((uri, i) => (
                <TouchableOpacity key={i} onPress={() => goTo(i)} activeOpacity={0.8}>
                  <Image
                    source={{ uri }}
                    style={[LB.thumb, i === current && LB.thumbActive]}
                    resizeMode="cover"
                  />
                  {i === current && <View style={LB.thumbActiveLine} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

        </SafeAreaView>
      </Animated.View>
    </Modal>
  )
}

// ── Image Gallery Grid ────────────────────────────────────────────────────────
function ImageGallery({
  images, onPress,
}: {
  images: string[]; onPress: (i: number) => void
}) {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <TouchableOpacity onPress={() => onPress(0)} activeOpacity={0.9} style={IG.singleWrap}>
        <Image source={{ uri: images[0] }} style={IG.singleImg} resizeMode="cover" />
        <View style={IG.hint}>
          <Text style={IG.hintTxt}>🔍 Tap to expand</Text>
        </View>
      </TouchableOpacity>
    )
  }

  const primary = images[0]
  const rest    = images.slice(1, 3)
  const extra   = images.length - 3

  return (
    <View>
      <View style={IG.grid}>
        {/* Main large image */}
        <TouchableOpacity style={IG.mainWrap} onPress={() => onPress(0)} activeOpacity={0.9}>
          <Image source={{ uri: primary }} style={IG.mainImg} resizeMode="cover" />
        </TouchableOpacity>

        {/* Side column */}
        {rest.length > 0 && (
          <View style={IG.sideCol}>
            {rest.map((uri, i) => {
              const realIdx = i + 1
              const isLast  = realIdx === 2 && images.length > 3
              return (
                <TouchableOpacity
                  key={i}
                  style={IG.sideWrap}
                  onPress={() => onPress(realIdx)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri }} style={IG.sideImg} resizeMode="cover" />
                  {isLast && extra > 0 && (
                    <View style={IG.overflow}>
                      <Text style={IG.overflowTxt}>+{extra + 1}</Text>
                      <Text style={{ color: '#fff', fontSize: 10, marginTop: 2 }}>more</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>

      {/* Strip for 4+ images */}
      {images.length > 3 && (
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={IG.strip}
        >
          {images.map((uri, i) => (
            <TouchableOpacity key={i} onPress={() => onPress(i)} activeOpacity={0.85}>
              <Image source={{ uri }} style={IG.stripThumb} resizeMode="cover" />
              <View style={[IG.stripIdx, { display: i === 0 ? 'none' : 'flex' }]}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{i + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={IG.hint}>
        <Text style={IG.hintTxt}>📸 {images.length} photos · Tap any to view full screen</Text>
      </View>
    </View>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  order:          OrderDetail
  onAcceptQuote?: () => void
}

export default function CustomOrderFlow({ order, onAcceptQuote }: Props) {
  const [lbOpen,  setLbOpen]  = useState(false)
  const [lbStart, setLbStart] = useState(0)

  if (!order.custom_order_ref) return null

  const customStatus = (order as any).custom_order_status ?? order.status
  const currentIdx   = CUSTOM_STEPS.findIndex(s => s.key === customStatus)
  const isRejected   = customStatus === 'rejected'
  const isQuoted     = customStatus === 'quoted'
  const isConfirmed  = customStatus === 'confirmed'
  const isDelivered  = customStatus === 'delivered'
  const currentStep  = CUSTOM_STEPS[currentIdx]

  // Categories
  const rawCat = (order as any).custom_category ?? ''
  const cats: string[] = Array.isArray(rawCat)
    ? rawCat
    : typeof rawCat === 'string' && rawCat
      ? rawCat.split(',').map((s: string) => s.trim())
      : []

  // Images
  const images = parseImages((order as any).custom_image_url)

  const openLb = (i: number) => { setLbStart(i); setLbOpen(true) }

  const statusPillBg =
    isRejected   ? '#EF4444'
    : isDelivered  ? '#10B981'
    : isQuoted     ? '#2563EB'
    : isConfirmed  ? '#065F46'
    : currentIdx >= 0 ? '#F59E0B'
    : '#9CA3AF'

  return (
    <>
      <View style={S.wrap}>

        {/* ── Header ── */}
        <View style={S.header}>
          <View style={S.headerIcon}>
            <Text style={{ fontSize: 18 }}>✏️</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={S.title}>Custom Order Request</Text>
            <Text style={S.ref}>{order.custom_order_ref}</Text>
          </View>
          <View style={[S.statusPill, { backgroundColor: statusPillBg }]}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
              {currentStep?.emoji ?? ''} {currentStep?.label ?? customStatus.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Current step description ── */}
        {currentStep && !isRejected && (
          <View style={S.stepDesc}>
            <Text style={{ fontSize: 13, color: '#065F46', fontWeight: '700' }}>
              {currentStep.emoji}  {currentStep.desc}
            </Text>
          </View>
        )}

        {/* ── Category chips ── */}
        {cats.length > 0 && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingBottom: 12, paddingTop: 4 }}
          >
            {cats.map(c => (
              <View
                key={c}
                style={[S.catChip, { backgroundColor: (CAT_COLORS[c] ?? CAT_COLORS.other).bg }]}
              >
                <Text style={{ fontSize: 13 }}>{CAT_EMOJI[c] ?? '📦'}</Text>
                <Text style={[S.catTxt, { color: (CAT_COLORS[c] ?? CAT_COLORS.other).text }]}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ── Reference images ── */}
        {images.length > 0 && (
          <View style={S.imageSection}>
            <Text style={S.imageLabel}>📸 Reference images from customer</Text>
            <ImageGallery images={images} onPress={openLb} />
          </View>
        )}

        {/* ── Progress stepper ── */}
        {!isRejected && (
          <View style={S.stepperWrap}>
            <Text style={S.stepperTitle}>Order Progress</Text>
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8, paddingHorizontal: 4 }}
            >
              {CUSTOM_STEPS.map((step, idx) => {
                const done    = currentIdx >= idx
                const current = currentIdx === idx
                const isLast  = idx === CUSTOM_STEPS.length - 1
                return (
                  <View key={step.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ alignItems: 'center', width: 72 }}>
                      <View style={[S.dot, done && S.dotDone, current && S.dotCurrent]}>
                        <Text style={{ fontSize: 16 }}>{step.emoji}</Text>
                      </View>
                      <Text
                        style={[
                          S.stepLbl,
                          done && { color: '#065F46', fontWeight: '700' },
                          current && { color: '#059669', fontWeight: '800' },
                        ]}
                        numberOfLines={1}
                      >
                        {step.label}
                      </Text>
                    </View>
                    {!isLast && (
                      <View style={[
                        S.connector,
                        { backgroundColor: currentIdx > idx ? '#10B981' : '#D1FAE5' },
                      ]} />
                    )}
                  </View>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Quote card ── */}
        {isQuoted && (order as any).quoted_amount && (
          <View style={S.quoteCard}>
            <View style={S.quoteHeader}>
              <Text style={{ fontSize: 22 }}>💬</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={S.quoteTitle}>Quote from PBExpress Team</Text>
                <Text style={{ fontSize: 11, color: '#92400E', marginTop: 1 }}>
                  Review and accept to confirm your order
                </Text>
              </View>
            </View>
            {(order as any).quote_message && (
              <View style={S.quoteMsgBox}>
                <Text style={S.quoteMsg}>{(order as any).quote_message}</Text>
              </View>
            )}
            <View style={S.quoteFooter}>
              <View>
                <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>
                  Total quoted amount
                </Text>
                <Text style={S.quoteAmt}>
                  ₹{Number((order as any).quoted_amount).toFixed(2)}
                </Text>
              </View>
              {onAcceptQuote && (
                <TouchableOpacity
                  style={S.acceptBtn}
                  onPress={onAcceptQuote}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                    Accept Quote ✓
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Confirmed banner ── */}
        {isConfirmed && (
          <View style={S.confirmedCard}>
            <Text style={{ fontSize: 20 }}>✅</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: '800', color: '#065F46', fontSize: 13 }}>
                Quote accepted — order confirmed!
              </Text>
              <Text style={{ fontSize: 12, color: '#047857', marginTop: 2 }}>
                Our team is now sourcing your items
              </Text>
            </View>
          </View>
        )}

        {/* ── Rejected card ── */}
        {isRejected && (
          <View style={S.rejectedCard}>
            <Text style={{ fontSize: 22, marginBottom: 6 }}>🚫</Text>
            <Text style={{ fontWeight: '800', color: '#991B1B', fontSize: 15, textAlign: 'center' }}>
              Request could not be fulfilled
            </Text>
            {(order as any).quote_message && (
              <View style={S.rejectedMsgBox}>
                <Text style={{ fontSize: 13, color: '#7F1D1D', lineHeight: 20, textAlign: 'center' }}>
                  {(order as any).quote_message}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
              You can place a new custom request anytime
            </Text>
          </View>
        )}

        {/* ── Footer info ── */}
        {!isRejected && (
          <View style={S.infoRow}>
            <Text style={{ fontSize: 13 }}>ℹ️</Text>
            <Text style={S.infoTxt}>
              Our team personally reviews every request.
              You&apos;ll be notified of every status update.
            </Text>
          </View>
        )}

      </View>

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        startIndex={lbStart}
        visible={lbOpen}
        onClose={() => setLbOpen(false)}
      />
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  wrap:         { backgroundColor: '#F0FDF4', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: '#A7F3D0' },
  header:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  headerIcon:   { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  title:        { fontWeight: '800', color: '#065F46', fontSize: 14 },
  ref:          { fontSize: 11, color: '#059669', fontFamily: 'monospace', marginTop: 1 },
  statusPill:   { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  stepDesc:     { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  catChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  catTxt:       { fontSize: 11, fontWeight: '700' },
  imageSection: { marginBottom: 12 },
  imageLabel:   { fontSize: 12, color: '#065F46', fontWeight: '700', marginBottom: 8 },
  stepperWrap:  { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#D1FAE5' },
  stepperTitle: { fontSize: 12, fontWeight: '800', color: '#6B7280', marginBottom: 4 },
  dot:          { width: 44, height: 44, borderRadius: 22, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  dotDone:      { backgroundColor: '#6EE7B7' },
  dotCurrent:   { backgroundColor: '#10B981', borderWidth: 2.5, borderColor: '#fff', elevation: 3, shadowColor: '#10B981', shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  stepLbl:      { fontSize: 9, color: '#9CA3AF', marginTop: 4, textAlign: 'center', width: 70 },
  connector:    { width: 12, height: 2, marginBottom: 14, borderRadius: 1 },
  quoteCard:    { backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1.5, borderColor: '#FDE68A' },
  quoteHeader:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  quoteTitle:   { fontWeight: '800', color: '#92400E', fontSize: 14 },
  quoteMsgBox:  { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 10 },
  quoteMsg:     { fontSize: 13, color: '#78350F', lineHeight: 20 },
  quoteFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  quoteAmt:     { fontSize: 26, fontWeight: '900', color: '#D97706', marginTop: 2 },
  acceptBtn:    { backgroundColor: '#D97706', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 11, elevation: 2, shadowColor: '#D97706', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  confirmedCard:{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#86EFAC' },
  rejectedCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: '#FECACA', alignItems: 'center' },
  rejectedMsgBox:{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginTop: 8, width: '100%' },
  infoRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  infoTxt:      { fontSize: 11, color: '#6EE7B7', flex: 1, lineHeight: 16 },
})

const IG = StyleSheet.create({
  singleWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  singleImg:  { width: '100%', height: 180, borderRadius: 12 },
  grid:       { flexDirection: 'row', gap: 3, borderRadius: 12, overflow: 'hidden', height: 180 },
  mainWrap:   { flex: 2 },
  mainImg:    { width: '100%', height: '100%' },
  sideCol:    { flex: 1, gap: 3 },
  sideWrap:   { flex: 1, position: 'relative' },
  sideImg:    { width: '100%', height: '100%' },
  overflow:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' },
  overflowTxt:{ color: '#fff', fontSize: 22, fontWeight: '900' },
  strip:      { gap: 6, paddingTop: 6, paddingHorizontal: 2 },
  stripThumb: { width: 52, height: 52, borderRadius: 8, position: 'relative' },
  stripIdx:   { position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1 },
  hint:       { marginTop: 6 },
  hintTxt:    { fontSize: 11, color: '#6B7280', textAlign: 'center' },
})

const LB = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: '#000' },
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  counterPill:   { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  counterTxt:    { color: '#fff', fontSize: 13, fontWeight: '700' },
  closeBtn:      { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  slide:         { width: SW, height: SH * 0.60, alignItems: 'center', justifyContent: 'center' },
  fullImg:       { width: SW, height: SH * 0.60 },
  arrow:         { position: 'absolute', top: '42%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 30, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  arrowL:        { left: 10 },
  arrowR:        { right: 10 },
  arrowTxt:      { color: '#fff', fontSize: 34, fontWeight: '200', lineHeight: 40 },
  dotsRow:       { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot:           { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:     { backgroundColor: '#fff', width: 22, borderRadius: 4 },
  thumbStrip:    { paddingHorizontal: 14, gap: 8, paddingBottom: 20 },
  thumb:         { width: 58, height: 58, borderRadius: 10, opacity: 0.45 },
  thumbActive:   { opacity: 1 },
  thumbActiveLine:{ height: 3, backgroundColor: '#fff', borderRadius: 2, marginTop: 3 },
})
