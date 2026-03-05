 
import React, { useState, useRef } from 'react'
import {
  View, Text, Image, FlatList, ScrollView,
  TouchableOpacity, StyleSheet, Modal,
  Dimensions, Animated, SafeAreaView, StatusBar,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import type { OrderItem } from './types'

const { width: SW, height: SH } = Dimensions.get('window')

// ── Image parser ──────────────────────────────────────────────────────────────
function parseImages(raw: any): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try {
    const p = JSON.parse(raw)
    if (Array.isArray(p)) return p.filter(Boolean)
  } catch { /* not JSON */ }
  return typeof raw === 'string' ? [raw] : []
}

// ── Shared Lightbox (same as CustomOrderFlow) ─────────────────────────────────
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
          <View style={LB.topBar}>
            <View style={LB.counterPill}>
              <Text style={LB.counterTxt}>{current + 1} / {images.length}</Text>
            </View>
            <TouchableOpacity style={LB.closeBtn} onPress={onClose}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatRef}
            data={images}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: SW, offset: SW * i, index: i })}
            onMomentumScrollEnd={e => setCurrent(Math.round(e.nativeEvent.contentOffset.x / SW))}
            renderItem={({ item }) => (
              <View style={LB.slide}>
                <Image source={{ uri: item }} style={LB.fullImg} resizeMode="contain" />
              </View>
            )}
          />

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

          {images.length > 1 && (
            <View style={LB.dotsRow}>
              {images.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => goTo(i)}>
                  <View style={[LB.dot, i === current && LB.dotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          )}

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
                  {i === current && <View style={LB.thumbLine} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  )
}

// ── Custom image header gallery ───────────────────────────────────────────────
function CustomImageHeader({
  images, onPress,
}: {
  images: string[]; onPress: (i: number) => void
}) {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <TouchableOpacity style={CI.wrap} onPress={() => onPress(0)} activeOpacity={0.9}>
        <Image source={{ uri: images[0] }} style={CI.single} resizeMode="cover" />
        <View style={CI.badge}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🔍 View full</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={CI.grid}>
        <TouchableOpacity style={{ flex: 2 }} onPress={() => onPress(0)} activeOpacity={0.9}>
          <Image source={{ uri: images[0] }} style={CI.main} resizeMode="cover" />
        </TouchableOpacity>
        <View style={CI.sideCol}>
          {images.slice(1, 3).map((uri, i) => {
            const realIdx = i + 1
            const isLast  = realIdx === 2 && images.length > 3
            return (
              <TouchableOpacity
                key={i} style={CI.sideWrap}
                onPress={() => onPress(realIdx)} activeOpacity={0.9}
              >
                <Image source={{ uri }} style={CI.side} resizeMode="cover" />
                {isLast && images.length > 3 && (
                  <View style={CI.overflow}>
                    <Text style={CI.overflowTxt}>+{images.length - 3}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
      {/* Scrollable strip for 3+ */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={CI.strip}
      >
        {images.map((uri, i) => (
          <TouchableOpacity key={i} onPress={() => onPress(i)} activeOpacity={0.85}>
            <Image source={{ uri }} style={CI.stripImg} resizeMode="cover" />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={CI.caption}>📸 {images.length} reference photos · tap to expand</Text>
    </View>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  items:          OrderItem[]
  isStore:        boolean
  isCustom?:      boolean
  customImageUrl?: string | null
}

export default function OrderItems({
  items, isStore, isCustom = false, customImageUrl = null,
}: Props) {
  const [lbOpen,  setLbOpen]  = useState(false)
  const [lbStart, setLbStart] = useState(0)

  const images = parseImages(customImageUrl)
  const openLb = (i: number) => { setLbStart(i); setLbOpen(true) }

  const isDescriptionFallback =
    isCustom && items.length === 1 && items[0]?.id === 'desc'

  // ── Empty custom order ─────────────────────────────────────────────────────
  if (isCustom && items.length === 0) {
    return (
      <>
        <View style={S.section}>
          <Text style={S.title}>✏️ Custom Request</Text>
          {images.length > 0 && (
            <CustomImageHeader images={images} onPress={openLb} />
          )}
          <View style={S.emptyCustom}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 }}>
              Items pending review
            </Text>
            <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 }}>
              Your item list will be confirmed once our team reviews the request and sends a quote.
            </Text>
          </View>
        </View>
        <ImageLightbox images={images} startIndex={lbStart} visible={lbOpen} onClose={() => setLbOpen(false)} />
      </>
    )
  }

  return (
    <>
      <View style={S.section}>
        <View style={S.titleRow}>
          <Text style={S.title}>
            {isCustom
              ? `✏️ Requested Items`
              : isStore
                ? `🛍️ Ordered Products`
                : `🛒 Items`}
          </Text>
          <View style={S.countBadge}>
            <Text style={{ fontSize: 11, color: '#fff', fontWeight: '800' }}>
              {isDescriptionFallback ? 1 : items.length}
            </Text>
          </View>
        </View>

        {/* ── Custom reference images ── */}
        {isCustom && images.length > 0 && (
          <CustomImageHeader images={images} onPress={openLb} />
        )}

        {/* ── Item rows ── */}
        {items.map((item, i) => (
          <ItemRow
            key={item.id ?? i}
            item={item}
            index={i}
            isCustom={isCustom}
            isDescriptionFallback={isDescriptionFallback}
            isLast={i === items.length - 1}
            onImagePress={openLb}
          />
        ))}
      </View>

      <ImageLightbox
        images={images}
        startIndex={lbStart}
        visible={lbOpen}
        onClose={() => setLbOpen(false)}
      />
    </>
  )
}

// ── Item Row ──────────────────────────────────────────────────────────────────
function ItemRow({
  item, isCustom, isDescriptionFallback, isLast, onImagePress,
}: {
  item:                  OrderItem
  index:                 number
  isCustom:              boolean
  isDescriptionFallback: boolean
  isLast:                boolean
  onImagePress:          (i: number) => void
}) {
  const [imgError,     setImgError]     = useState(false)
  const [itemLbOpen,   setItemLbOpen]   = useState(false)

  const isFree       = item.is_free || item.price === 0
  const isCustomProd = (item as any).is_custom_product ?? false
  const disc         = (item.discount_percentage ?? 0) > 0
    ? item.price * (item.discount_percentage! / 100) : 0
  const effective    = (item.price - disc) * item.quantity
  const imageUri     = item.image_url && !imgError ? item.image_url : null

  // Item-level images (for catalog items)
  const itemImages = imageUri ? [imageUri] : []

  return (
    <>
      <View style={[
        S.row,
        isFree && S.rowFree,
        isCustomProd && S.rowCustom,
        isDescriptionFallback && S.rowDesc,
        !isLast && { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
      ]}>

        {/* ── Thumbnail ── */}
        {imageUri ? (
          <TouchableOpacity onPress={() => setItemLbOpen(true)} activeOpacity={0.9}>
            <Image
              source={{ uri: imageUri }}
              style={S.itemImage}
              resizeMode="cover"
              onError={() => setImgError(true)}
            />
            <View style={S.zoomHint}>
              <Text style={{ fontSize: 9 }}>🔍</Text>
            </View>
          </TouchableOpacity>
        ) : isCustom && !isDescriptionFallback ? (
          <View style={S.itemImagePlaceholder}>
            <Text style={{ fontSize: 20 }}>📦</Text>
          </View>
        ) : null}

        {/* ── Details ── */}
        <View style={{ flex: 1, paddingRight: 8 }}>

          {/* Name + veg dot + badges */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {item.is_veg != null && (
              <View style={[S.vegDot, { backgroundColor: item.is_veg ? '#16A34A' : '#DC2626' }]} />
            )}
            <Text
              style={[
                S.name,
                isFree && { color: '#065F46' },
                isDescriptionFallback && { fontStyle: 'italic', color: '#374151' },
              ]}
              numberOfLines={2}
            >
              {isDescriptionFallback ? `📋 ${item.name}` : item.name}
            </Text>
          </View>

          {/* Badges row */}
          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 3 }}>
            {isCustomProd && (
              <View style={S.customProdBadge}>
                <Text style={{ color: '#5B21B6', fontSize: 9, fontWeight: '800' }}>📦 CATALOG</Text>
              </View>
            )}
            {isFree && (
              <View style={S.freeBadge}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>🎁 FREE</Text>
              </View>
            )}
          </View>

          {item.category && (
            <Text style={S.category}>{item.category}</Text>
          )}

          {(item.discount_percentage ?? 0) > 0 && !isFree && (
            <Text style={S.discTxt}>
              ₹{item.price.toFixed(0)} → {item.discount_percentage}% off
            </Text>
          )}

          {item.note && (
            <View style={S.noteBox}>
              <Text style={{ fontSize: 11, color: '#92400E' }}>📝 {item.note}</Text>
            </View>
          )}

          {isDescriptionFallback && (
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
              Full breakdown added after review
            </Text>
          )}
        </View>

        {/* ── Qty + Price ── */}
        {!isDescriptionFallback && (
          <View style={S.priceCol}>
            <View style={S.qtyBadge}>
              <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '700' }}>
                ×{item.quantity}
              </Text>
            </View>
            <Text style={[S.price, isFree && { color: '#065F46' }]}>
              {isFree
                ? 'FREE'
                : item.price === 0
                  ? 'TBD'
                  : `₹${effective.toFixed(0)}`}
            </Text>
          </View>
        )}
      </View>

      {/* Per-item image lightbox */}
      {itemImages.length > 0 && (
        <ImageLightbox
          images={itemImages}
          startIndex={0}
          visible={itemLbOpen}
          onClose={() => setItemLbOpen(false)}
        />
      )}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  section:            { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  titleRow:           { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title:              { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  countBadge:         { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  emptyCustom:        { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 20, alignItems: 'center', marginTop: 8 },
  row:                { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  rowFree:            { backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 8, marginBottom: 4, borderBottomWidth: 0 },
  rowCustom:          { backgroundColor: '#F5F3FF', borderRadius: 10, paddingHorizontal: 8, marginBottom: 4, borderBottomWidth: 0 },
  rowDesc:            { backgroundColor: '#FFFBEB', borderRadius: 10, paddingHorizontal: 8, marginBottom: 4, borderWidth: 1, borderColor: '#FDE68A', borderBottomWidth: 1 },
  itemImage:          { width: 52, height: 52, borderRadius: 10, backgroundColor: '#F3F4F6' },
  zoomHint:           { position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: 2 },
  itemImagePlaceholder:{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center' },
  vegDot:             { width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: '#fff' },
  name:               { fontWeight: '700', fontSize: 14, color: '#1F2937', flex: 1 },
  customProdBadge:    { backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  freeBadge:          { backgroundColor: '#16A34A', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  category:           { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  discTxt:            { fontSize: 11, color: '#F97316', marginTop: 2, fontWeight: '600' },
  noteBox:            { backgroundColor: '#FFFBEB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginTop: 5, borderWidth: 1, borderColor: '#FDE68A' },
  priceCol:           { alignItems: 'flex-end', gap: 4, minWidth: 56 },
  qtyBadge:           { backgroundColor: '#F3F4F6', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  price:              { fontWeight: '900', color: COLORS.primary, fontSize: 14 },
})

const CI = StyleSheet.create({
  wrap:       { borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' },
  single:     { width: '100%', height: 180, borderRadius: 12 },
  badge:      { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  grid:       { flexDirection: 'row', gap: 3, height: 180, borderRadius: 12, overflow: 'hidden' },
  main:       { width: '100%', height: '100%' },
  sideCol:    { flex: 1, gap: 3 },
  sideWrap:   { flex: 1, position: 'relative' },
  side:       { width: '100%', height: '100%' },
  overflow:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)', alignItems: 'center', justifyContent: 'center' },
  overflowTxt:{ color: '#fff', fontSize: 22, fontWeight: '900' },
  strip:      { gap: 5, paddingTop: 5 },
  stripImg:   { width: 52, height: 52, borderRadius: 8 },
  caption:    { fontSize: 11, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },
})

const LB = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: '#000' },
  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  counterPill: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  counterTxt:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  closeBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  slide:       { width: SW, height: SH * 0.60, alignItems: 'center', justifyContent: 'center' },
  fullImg:     { width: SW, height: SH * 0.60 },
  arrow:       { position: 'absolute', top: '42%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 30, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  arrowL:      { left: 10 },
  arrowR:      { right: 10 },
  arrowTxt:    { color: '#fff', fontSize: 34, fontWeight: '200', lineHeight: 40 },
  dotsRow:     { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot:         { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:   { backgroundColor: '#fff', width: 22, borderRadius: 4 },
  thumbStrip:  { paddingHorizontal: 14, gap: 8, paddingBottom: 20 },
  thumb:       { width: 58, height: 58, borderRadius: 10, opacity: 0.45 },
  thumbActive: { opacity: 1 },
  thumbLine:   { height: 3, backgroundColor: '#fff', borderRadius: 2, marginTop: 3 },
})
