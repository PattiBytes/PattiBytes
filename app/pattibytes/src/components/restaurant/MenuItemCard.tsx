 
import React, { memo } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import {
  dishTimingOf,
  finalPriceOf,
  imageUrlOf,
  isAvailableOf,
  isDishAvailableNow,
  isFeaturedOf,
  isVegOf,
  MenuOffer,
  minutesUntilAvailable,
  formatDishTiming,
  num,
  opensInLabel,
  str,
} from './menuTabShared'

interface MenuItemCardProps {
  item: any
  qty: number
  showImages: boolean
  openNow: boolean
  offer: MenuOffer | null
  onAddItem: (item: any) => void
  onInc: (item: any) => void
  onDec: (item: any) => void
  onSetQty?: (item: any, qty: number) => void
  onOpenItem?: (item: any) => void
  onShareItem?: (item: any) => void
}

function MenuItemCardComponent({
  item,
  qty,
  showImages,
  openNow,
  offer,
  onAddItem,
  onInc,
  onDec,
  onSetQty,
  onOpenItem,
  onShareItem,
}: MenuItemCardProps) {
  const dp = num(item?.discount_percentage ?? item?.discountpercentage, 0)
  const mrp = num(item?.price, 0)
  const price = finalPriceOf(item)
  const featured = isFeaturedOf(item)
  const available = isAvailableOf(item)
  const img = imageUrlOf(item)

  const timing = dishTimingOf(item)
  const dishAvailNow = isDishAvailableNow(timing)
  const timingLabel = formatDishTiming(timing)
  const minsUntil = !dishAvailNow ? minutesUntilAvailable(timing) : null

  const itemDisabled = !openNow || !dishAvailNow || !available

  return (
    <View style={[S.itemRow, itemDisabled && S.itemRowDisabled]}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <View style={S.nameRow}>
          <View
            style={[
              S.vegDot,
              { backgroundColor: isVegOf(item) ? '#16A34A' : '#DC2626' },
            ]}
          />
          <Text style={S.itemName}>{str(item?.name, 'Item')}</Text>
        </View>

        <View style={S.badgeRow}>
          {featured && (
            <View style={S.featuredPill}>
              <Text style={S.featuredTxt}>⭐ FEATURED</Text>
            </View>
          )}

          {!!offer?.label && (
            <View style={S.bestOfferPill}>
              <Text style={S.bestOfferTxt}>{offer.label}</Text>
            </View>
          )}

          {!!timingLabel && (
            <View style={[S.timingPill, !dishAvailNow && S.timingPillOff]}>
              <Text style={[S.timingTxt, !dishAvailNow && S.timingTxtOff]}>
                {dishAvailNow ? '🕐' : '⏸'} {timingLabel}
              </Text>
            </View>
          )}
        </View>

        {!!item?.description && (
          <Text style={S.itemDesc} numberOfLines={2}>
            {str(item?.description)}
          </Text>
        )}

        <View style={S.priceRow}>
          <Text style={S.itemPrice}>₹{price.toFixed(0)}</Text>
          {dp > 0 && (
            <>
              <Text style={S.mrp}>₹{mrp.toFixed(0)}</Text>
              <View style={S.disc}>
                <Text style={S.discTxt}>{dp.toFixed(0)}% OFF</Text>
              </View>
            </>
          )}
        </View>

        <View style={S.inlineRow}>
          {!!onOpenItem && (
            <Pressable style={S.inlineLink} onPress={() => onOpenItem(item)}>
              <Text style={S.inlineLinkTxt}>Details</Text>
            </Pressable>
          )}
          {!!onShareItem && (
            <Pressable style={S.inlineLink} onPress={() => onShareItem(item)}>
              <Text style={S.inlineLinkTxt}>Share</Text>
            </Pressable>
          )}
        </View>

        {!available && <Text style={S.notAvail}>Unavailable</Text>}

        {available && !dishAvailNow && timingLabel && (
          <Text style={S.notAvailTiming}>
            Not available now · Available {timingLabel}
            {minsUntil != null && minsUntil > 0 ? ` (${opensInLabel(minsUntil)})` : ''}
          </Text>
        )}

        {available && dishAvailNow && !openNow && (
          <Text style={S.notAvailTiming}>
            Available when restaurant opens
          </Text>
        )}
      </View>

      <View style={S.rightCol}>
        {showImages && (
          <View style={[S.imgWrap, itemDisabled && { opacity: 0.5 }]}>
            {img ? (
              <Image
                source={{ uri: img }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : (
              <View style={S.imgFallback}>
                <Text style={{ fontSize: 22 }}>🍔</Text>
              </View>
            )}

            {!dishAvailNow && available && (
              <View style={S.imgOverlay}>
                <Text style={S.imgOverlayTxt}>⏸</Text>
              </View>
            )}

            {!openNow && (
              <View style={S.imgOverlay}>
                <Text style={S.imgOverlayTxt}>🔴</Text>
              </View>
            )}
          </View>
        )}

        {qty <= 0 ? (
          <Pressable
            style={[S.addBtn, itemDisabled && S.addBtnDisabled]}
            onPress={() => !itemDisabled && onAddItem(item)}
            disabled={itemDisabled}
          >
            <Text style={[S.addBtnTxt, itemDisabled && S.addBtnTxtDisabled]}>
              {!available ? 'N/A' : !dishAvailNow ? '⏸' : !openNow ? '🔴' : 'ADD'}
            </Text>
          </Pressable>
        ) : (
          <View style={S.qtyRow}>
            <Pressable style={S.qtyBtn} onPress={() => onDec(item)}>
              <Text style={S.qtyBtnTxt}>−</Text>
            </Pressable>

            <TextInput
              style={S.qtyInput}
              keyboardType="number-pad"
              value={String(qty)}
              onChangeText={text => {
                const next = Math.max(
                  0,
                  Number(text.replace(/[^0-9]/g, '')) || 0,
                )
                if (next === qty) return
                onSetQty?.(item, next)
              }}
              maxLength={3}
            />

            <Pressable
              style={[S.qtyBtn, itemDisabled && { opacity: 0.4 }]}
              onPress={() => !itemDisabled && onInc(item)}
              disabled={itemDisabled}
            >
              <Text style={S.qtyBtnTxt}>+</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  )
}

export default memo(
  MenuItemCardComponent,
  (prev, next) =>
    prev.item === next.item &&
    prev.qty === next.qty &&
    prev.showImages === next.showImages &&
    prev.openNow === next.openNow &&
    prev.offer?.label === next.offer?.label,
)

const S = StyleSheet.create({
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginHorizontal: 12,
    borderRadius: 14,
    marginTop: 10,
  },
  itemRowDisabled: { opacity: 0.55 },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginTop: 4,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },

  featuredPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  featuredTxt: {
    color: '#92400E',
    fontWeight: '900',
    fontSize: 11,
  },

  bestOfferPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestOfferTxt: {
    color: '#065F46',
    fontWeight: '900',
    fontSize: 11,
  },

  timingPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timingPillOff: { backgroundColor: '#F3F4F6' },
  timingTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  timingTxtOff: { color: '#9CA3AF' },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
  },
  mrp: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '800',
  },
  disc: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discTxt: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },

  inlineRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  inlineLink: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  inlineLinkTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },

  notAvail: {
    marginTop: 6,
    color: '#EF4444',
    fontWeight: '900',
    fontSize: 11,
  },
  notAvailTiming: {
    marginTop: 6,
    color: '#B45309',
    fontWeight: '700',
    fontSize: 10,
    lineHeight: 15,
  },

  rightCol: {
    alignItems: 'center',
    gap: 8,
  },
  imgWrap: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imgFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgOverlayTxt: { fontSize: 22 },

  addBtn: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  addBtnDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  addBtnTxt: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  addBtnTxtDisabled: {
    color: '#9CA3AF',
  },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnTxt: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
  },
  qtyInput: {
    minWidth: 38,
    paddingHorizontal: 4,
    textAlign: 'center',
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
})