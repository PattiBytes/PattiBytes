import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
} from 'react-native';
import { COLORS } from '../../lib/constants';
import { formatDishTiming } from '../../lib/dishTiming';

interface Props {
  visible: boolean;
  item: any | null;
  merchantName: string;
  onClose: () => void;
  onAdd: (item: any) => void;
  qty: number;
}

export default function ItemDetailsSheet({
  visible,
  item,
  merchantName,
  onClose,
  onAdd,
  qty,
}: Props) {
  if (!item) return null;
  const img = item.image_url ?? item.imageurl ?? null;
  const dp = Number(item.discount_percentage ?? item.discountpercentage ?? 0);
  const mrp = Number(item.price ?? 0);
  const price = dp > 0 ? mrp * (1 - dp / 100) : mrp;
  const timing = item.dish_timing ?? item.dishtiming ?? null;
  const timingLabel = formatDishTiming(timing);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={S.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={S.sheet}>
          <View style={S.handle} />
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Header row */}
            <View style={S.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={S.title} numberOfLines={2}>
                  {item.name ?? 'Dish'}
                </Text>
                <Text style={S.subtitle} numberOfLines={1}>
                  from {merchantName}
                </Text>
              </View>
              <Pressable onPress={onClose}>
                <Text style={S.closeTxt}>✕</Text>
              </Pressable>
            </View>

            {/* Image */}
            {img ? (
              <View style={S.imgWrap}>
                <Image
                  source={{ uri: img }}
                  style={S.img}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View style={[S.imgWrap, S.imgFallback]}>
                <Text style={{ fontSize: 40 }}>🍽️</Text>
              </View>
            )}

            {/* Price */}
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

            {/* Timing */}
            {timingLabel && (
              <View style={S.timingRow}>
                <Text style={S.timingTxt}>🕐 {timingLabel}</Text>
              </View>
            )}

            {/* Description */}
            {!!item.description && (
              <Text style={S.desc}>{String(item.description)}</Text>
            )}

            {/* Meta tags */}
            <View style={S.tagsRow}>
              {item.is_veg !== undefined && (
                <View
                  style={[
                    S.tag,
                    { backgroundColor: item.is_veg ? '#DCFCE7' : '#FEE2E2' },
                  ]}
                >
                  <Text
                    style={[
                      S.tagTxt,
                      { color: item.is_veg ? '#166534' : '#B91C1C' },
                    ]}
                  >
                    {item.is_veg ? 'VEG' : 'NON-VEG'}
                  </Text>
                </View>
              )}
              {!!item.category && (
                <View style={S.tag}>
                  <Text style={S.tagTxt}>{String(item.category)}</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom CTA */}
          <View style={S.bottomRow}>
            {qty > 0 && (
              <Text style={S.qtyHint}>
                In cart: <Text style={{ fontWeight: '900' }}>{qty}</Text>
              </Text>
            )}
            <Pressable style={S.addBtn} onPress={() => onAdd(item)}>
              <Text style={S.addBtnTxt}>
                {qty > 0 ? 'Add one more' : 'Add to cart'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  closeTxt: {
    fontSize: 22,
    color: '#9CA3AF',
    paddingHorizontal: 4,
  },
  imgWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  img: { width: '100%', height: 210 },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 210,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  mrp: {
    fontSize: 13,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    fontWeight: '800',
  },
  disc: {
    backgroundColor: '#EF4444',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  discTxt: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  timingRow: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 8,
  },
  timingTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  desc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tagTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  qtyHint: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  addBtnTxt: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
});