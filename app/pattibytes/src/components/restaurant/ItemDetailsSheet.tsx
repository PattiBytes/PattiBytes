import React, { useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Share,
  Platform,
  Animated,
  Alert,
  Linking,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import { formatDishTiming, isDishAvailableNow } from '../../lib/dishTiming'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  visible:      boolean
  item:         any | null
  merchantName: string
  merchantId?:  string        // used for deep-link URL if you add it later
  onClose:      () => void
  onAdd:        (item: any) => void
  onDec?:       (item: any) => void   // ← NEW: decrement support
  qty:          number
}

// ─── Share helpers ────────────────────────────────────────────────────────────

/**
 * Build a rich share payload for a single menu item.
 *
 * WhatsApp preview rules (strictly followed):
 *  1. URL must be https://
 *  2. URL must be on its OWN line — no text before or after on the same line
 *  3. A blank line BEFORE the URL triggers the large card preview
 *  4. message is used by Android (url is ignored there)
 *  5. url  is used by iOS   (message is shown below the card)
 *
 * Sharing order of priority:
 *   - If item has an image → try to share with image context (Cloudinary URL)
 *   - Always include: name, price, discount, restaurant, app store link
 *   - Works with: WhatsApp, Telegram, Instagram, SMS, Email, native share sheet
 */
function buildSharePayload(item: any, merchantName: string) {
  const name = String(item?.name ?? 'Check this out')

  const mrp  = Number(item?.price ?? 0)
  const dp   = Number(item?.discount_percentage ?? item?.discountpercentage ?? 0)
  const price = dp > 0 ? mrp * (1 - dp / 100) : mrp

  // Prefer the Cloudinary / remote image URL (already hosted — no upload needed)
  const imageUrl: string | null = item?.image_url ?? item?.imageurl ?? null

  // App store links
  const iosLink     = 'https://apps.apple.com/us/app/pattibytes-express/id6761598840'
  const androidLink = 'https://play.google.com/store/apps/details?id=com.pattibytes.express'
  const storeLink   = Platform.OS === 'ios' ? iosLink : androidLink

  // Price display
  const priceStr = dp > 0
    ? `₹${price.toFixed(0)} ~~₹${mrp.toFixed(0)}~~ (${dp.toFixed(0)}% OFF 🎉)`
    : `₹${price.toFixed(0)}`

  // Veg/non-veg
  const vegLabel = item?.is_veg === true ? '🟢 Veg' : item?.is_veg === false ? '🔴 Non-veg' : ''

  // Description (truncated to 120 chars)
  const descRaw   = String(item?.description ?? '').trim()
  const desc      = descRaw.length > 0
    ? (descRaw.length > 120 ? descRaw.slice(0, 117) + '…' : descRaw)
    : ''

  // The message — WhatsApp renders *bold*, _italic_, ~~strikethrough~
  const lines: string[] = [
    `🍽️ *${name}*`,
    vegLabel ? vegLabel : null,
    `💰 ${priceStr}`,
    `📍 ${merchantName} on *PattiBytes Express*`,
    desc ? `\n"${desc}"` : null,
    ``,                    // blank line → triggers WhatsApp large link-preview card
    storeLink,             // own line, nothing else
  ].filter(Boolean) as string[]

  const message = lines.join('\n')

  return {
    message,
    url:        storeLink,   // iOS system share card URL
    title:      `${name} · PattiBytes Express`,
    imageUrl,                // returned separately — used if we want to share image file
  }
}

/**
 * Robust share function — tries native Share API first,
 * falls back to Linking.openURL with a pre-composed WhatsApp URL,
 * then falls back to clipboard copy notification.
 */
async function shareItem(item: any, merchantName: string): Promise<void> {
  const { message, url, title } = buildSharePayload(item, merchantName)

  try {
    const result = await Share.share(
      {
        message, // Android: uses this (url is ignored by Android Share)
        url,     // iOS: attaches URL to system share card
        title,
      },
      {
        dialogTitle: `Share "${String(item?.name ?? 'dish')}"`,
        subject:     `${String(item?.name ?? 'dish')} on PattiBytes Express`,
        // tintColor:   COLORS.primary,   // iOS action sheet tint — uncomment if desired
      },
    )

    // result.action is 'sharedAction' on success, 'dismissedAction' on cancel
    // No alert needed — the native sheet is self-explanatory
    if (__DEV__ && result.action === Share.sharedAction) {
      console.log('[Share] shared via', result.activityType ?? 'unknown')
    }
  } catch (err: any) {
    // "User did not share" is a normal iOS cancel — don't alert
    const msg = String(err?.message ?? '')
    if (
      msg === 'User did not share' ||
      msg.includes('cancelled') ||
      msg.includes('dismissed')
    ) return

    // Fallback: open WhatsApp directly with pre-composed message
    // wa.me link with URL-encoded text — works even if Share API glitches
    try {
      const waText    = encodeURIComponent(message)
      const waFallback = `whatsapp://send?text=${waText}`
      const canOpen   = await Linking.canOpenURL(waFallback)

      if (canOpen) {
        await Linking.openURL(waFallback)
      } else {
        // Last resort: alert with message the user can copy manually
        Alert.alert(
          'Could not share',
          'Copy and paste this to share:\n\n' + message,
          [{ text: 'OK' }],
        )
      }
    } catch {
      Alert.alert('Share failed', 'Something went wrong. Try again.')
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ItemDetailsSheet({
  visible,
  item,
  merchantName,
  merchantId,
  onClose,
  onAdd,
  onDec,
  qty,
}: Props) {
  // ── Slide animation ──────────────────────────────────────────────────────
  const slideY = useRef(new Animated.Value(600)).current

  useEffect(() => {
    if (visible) {
      Animated.spring(slideY, {
        toValue:         0,
        useNativeDriver: true,
        bounciness:      4,
        speed:           18,
      }).start()
    } else {
      Animated.timing(slideY, {
        toValue:         600,
        duration:        220,
        useNativeDriver: true,
      }).start()
    }
  }, [visible, slideY])

  const handleShare = useCallback(() => {
    if (!item) return
    shareItem(item, merchantName)
  }, [item, merchantName])

  // Guard — must be after all hooks
  if (!item) return null

  // ── Derived values ───────────────────────────────────────────────────────
  const img: string | null   = item.image_url ?? item.imageurl ?? null
  const dp                   = Number(item.discount_percentage ?? item.discountpercentage ?? 0)
  const mrp                  = Number(item.price ?? 0)
  const price                = dp > 0 ? mrp * (1 - dp / 100) : mrp
  const timing               = item.dish_timing ?? item.dishtiming ?? null
  const timingLabel          = formatDishTiming(timing)
  const availableNow         = isDishAvailableNow(timing)
  const isVeg: boolean | null = item.is_veg ?? item.isveg ?? null
  const calories             = item.calories ?? item.kcal ?? null
  const serves               = item.serves ?? item.servings ?? null
  const isSpicy              = item.is_spicy ?? item.isspicy ?? false
  const isBestseller         = item.is_bestseller ?? item.isbestseller ?? false
  const isFeatured           = item.is_featured ?? item.isfeatured ?? false

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      animationType="none"       // we handle animation ourselves
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={S.overlay}>
        {/* Tap outside to close */}
        <Pressable style={{ flex: 1 }} onPress={onClose} />

        <Animated.View style={[S.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* ── Handle ── */}
          <View style={S.handle} />

          {/* ── Top row: title + share + close ── */}
          <View style={S.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={S.title} numberOfLines={2}>
                {item.name ?? 'Dish'}
              </Text>
              <Text style={S.subtitle} numberOfLines={1}>
                from {merchantName}
              </Text>
            </View>

            {/* Share button */}
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [S.iconBtn, pressed && { opacity: 0.6 }]}
              hitSlop={10}
              accessibilityLabel="Share this item"
            >
              <Text style={S.shareIcon}>↗</Text>
            </Pressable>

            {/* Close button */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [S.iconBtn, pressed && { opacity: 0.6 }]}
              hitSlop={10}
              accessibilityLabel="Close"
            >
              <Text style={S.closeTxt}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            bounces={false}
          >
            {/* ── Image ── */}
            {img ? (
              <View style={S.imgWrap}>
                <Image
                  source={{ uri: img }}
                  style={S.img}
                  resizeMode="cover"
                />
                {/* Badges on image */}
                <View style={S.imgBadges}>
                  {isBestseller && (
                    <View style={[S.imgBadge, { backgroundColor: '#F59E0B' }]}>
                      <Text style={S.imgBadgeTxt}>⭐ Bestseller</Text>
                    </View>
                  )}
                  {isFeatured && !isBestseller && (
                    <View style={[S.imgBadge, { backgroundColor: COLORS.primary }]}>
                      <Text style={S.imgBadgeTxt}>✦ Featured</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={[S.imgWrap, S.imgFallback]}>
                <Text style={{ fontSize: 52 }}>🍽️</Text>
                {isBestseller && (
                  <View style={[S.imgBadge, { backgroundColor: '#F59E0B', marginTop: 10 }]}>
                    <Text style={S.imgBadgeTxt}>⭐ Bestseller</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Availability warning ── */}
            {timing && !availableNow && (
              <View style={S.unavailBanner}>
                <Text style={S.unavailTxt}>
                  ⛔ Not available right now
                  {timingLabel ? ` · Available ${timingLabel}` : ''}
                </Text>
              </View>
            )}

            {/* ── Price row ── */}
            <View style={S.priceRow}>
              <Text style={S.price}>₹{price.toFixed(0)}</Text>
              {dp > 0 && (
                <>
                  <Text style={S.mrp}>₹{mrp.toFixed(0)}</Text>
                  <View style={S.disc}>
                    <Text style={S.discTxt}>{dp.toFixed(0)}% OFF</Text>
                  </View>
                </>
              )}
            </View>

            {/* ── Timing ── */}
            {timingLabel && availableNow && (
              <View style={S.timingRow}>
                <Text style={S.timingTxt}>🕐 {timingLabel}</Text>
              </View>
            )}

            {/* ── Description ── */}
            {!!item.description && (
              <Text style={S.desc}>{String(item.description)}</Text>
            )}

            {/* ── Meta tags ── */}
            <View style={S.tagsRow}>
              {isVeg !== null && (
                <View style={[S.tag, { backgroundColor: isVeg ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text style={[S.tagTxt, { color: isVeg ? '#166534' : '#B91C1C' }]}>
                    {isVeg ? '🟢 VEG' : '🔴 NON-VEG'}
                  </Text>
                </View>
              )}
              {isSpicy && (
                <View style={[S.tag, { backgroundColor: '#FFF7ED' }]}>
                  <Text style={[S.tagTxt, { color: '#C2410C' }]}>🌶️ Spicy</Text>
                </View>
              )}
              {!!item.category && (
                <View style={S.tag}>
                  <Text style={S.tagTxt}>{String(item.category)}</Text>
                </View>
              )}
              {calories !== null && (
                <View style={[S.tag, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={[S.tagTxt, { color: '#166534' }]}>
                    🔥 {calories} kcal
                  </Text>
                </View>
              )}
              {serves !== null && (
                <View style={[S.tag, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[S.tagTxt, { color: '#1D4ED8' }]}>
                    👥 Serves {serves}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Share nudge row ── */}
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [S.shareNudge, pressed && { opacity: 0.75 }]}
            >
              <Text style={S.shareNudgeTxt}>
                📤 Share this item with friends
              </Text>
            </Pressable>
          </ScrollView>

          {/* ── Bottom CTA ── */}
          <View style={S.bottomRow}>
            {qty > 0 && onDec ? (
              /* Stepper when item is already in cart */
              <View style={S.stepper}>
                <Pressable
                  onPress={() => onDec(item)}
                  style={({ pressed }) => [S.stepBtn, pressed && { opacity: 0.7 }]}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={S.stepBtnTxt}>−</Text>
                </Pressable>
                <Text style={S.stepQty}>{qty}</Text>
                <Pressable
                  onPress={() => onAdd(item)}
                  style={({ pressed }) => [S.stepBtn, S.stepBtnAdd, pressed && { opacity: 0.7 }]}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={[S.stepBtnTxt, { color: '#fff' }]}>+</Text>
                </Pressable>
              </View>
            ) : (
              /* Plain add button when qty === 0 or no onDec provided */
              <>
                {qty > 0 && (
                  <Text style={S.qtyHint}>
                    In cart: <Text style={{ fontWeight: '900' }}>{qty}</Text>
                  </Text>
                )}
                <Pressable
                  style={({ pressed }) => [
                    S.addBtn,
                    !availableNow && S.addBtnDisabled,
                    pressed && availableNow && { opacity: 0.82 },
                  ]}
                  onPress={() => availableNow && onAdd(item)}
                  disabled={!availableNow}
                >
                  <Text style={S.addBtnTxt}>
                    {!availableNow
                      ? 'Not available now'
                      : qty > 0
                        ? `Add one more  ₹${price.toFixed(0)}`
                        : `Add to cart  ₹${price.toFixed(0)}`}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius:  26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop:        10,
    paddingBottom:     Platform.OS === 'ios' ? 30 : 16,
    maxHeight:         '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 10,
  },

  /* Top row */
  topRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 6, marginBottom: 12,
  },
  title: {
    fontSize: 19, fontWeight: '900',
    color: '#111827', lineHeight: 24,
  },
  subtitle: {
    fontSize: 12, color: '#9CA3AF', marginTop: 3,
  },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  shareIcon: {
    fontSize: 17, color: COLORS.primary, fontWeight: '900',
    lineHeight: 20,
  },
  closeTxt: {
    fontSize: 16, color: '#6B7280', fontWeight: '700',
    lineHeight: 20,
  },

  /* Image */
  imgWrap: {
    width: '100%', borderRadius: 16,
    overflow: 'hidden', backgroundColor: '#F3F4F6',
    marginBottom: 14, position: 'relative',
  },
  img: { width: '100%', height: 220 },
  imgFallback: {
    alignItems: 'center', justifyContent: 'center', height: 180,
  },
  imgBadges: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', gap: 6,
  },
  imgBadge: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 999,
  },
  imgBadgeTxt: {
    color: '#fff', fontSize: 11, fontWeight: '900',
  },

  /* Unavailability banner */
  unavailBanner: {
    backgroundColor: '#FEF2F2', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10,
    borderWidth: 1, borderColor: '#FECACA',
  },
  unavailTxt: {
    fontSize: 12, fontWeight: '700', color: '#B91C1C',
  },

  /* Price */
  priceRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 8,
  },
  price: {
    fontSize: 22, fontWeight: '900', color: COLORS.primary,
  },
  mrp: {
    fontSize: 14, color: '#9CA3AF',
    textDecorationLine: 'line-through', fontWeight: '700',
  },
  disc: {
    backgroundColor: '#EF4444', borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  discTxt: {
    color: '#FFF', fontSize: 11, fontWeight: '900',
  },

  /* Timing */
  timingRow: {
    backgroundColor: '#EFF6FF', borderRadius: 9,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  timingTxt: {
    fontSize: 11, fontWeight: '800', color: '#1D4ED8',
  },

  /* Description */
  desc: {
    fontSize: 13.5, color: '#4B5563', lineHeight: 21, marginBottom: 12,
  },

  /* Tags */
  tagsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: '#F3F4F6',
  },
  tagTxt: {
    fontSize: 11, fontWeight: '800', color: '#374151',
  },

  /* Share nudge */
  shareNudge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0FDF4', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
    marginBottom: 4,
  },
  shareNudgeTxt: {
    fontSize: 13, fontWeight: '700', color: '#15803D',
  },

  /* Bottom CTA */
  bottomRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, marginTop: 10,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  qtyHint: {
    flex: 1, fontSize: 12, color: '#6B7280',
  },
  addBtn: {
    flex: 1, backgroundColor: COLORS.primary,
    borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  addBtnTxt: {
    color: '#FFF', fontWeight: '900', fontSize: 14,
  },

  /* Stepper */
  stepper: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 999,
    borderWidth: 1.5, borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 48, height: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnAdd: {
    backgroundColor: COLORS.primary,
  },
  stepBtnTxt: {
    fontSize: 22, fontWeight: '900', color: COLORS.primary,
  },
  stepQty: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '900', color: '#111827',
  },
})