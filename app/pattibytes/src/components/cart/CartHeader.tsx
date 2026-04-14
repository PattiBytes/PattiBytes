import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../lib/constants';
import type { OrderType } from './types';

const META: Record<
  OrderType,
  { label: string; emoji: string; color: string; bg: string }
> = {
  restaurant: {
    label: 'Restaurant Order',
    emoji: '🍽️',
    color: '#B45309',
    bg: '#FEF3C7',
  },
  store: {
    label: 'PBExpress Store',
    emoji: '📦',
    color: '#5B21B6',
    bg: '#EDE9FE',
  },
  custom: {
    label: 'Custom Order',
    emoji: '✏️',
    color: '#065F46',
    bg: '#ECFDF5',
  },
};

interface Props {
  merchantName: string;
  merchantId: string | null;
  displayDistKm: number;
  orderType: OrderType;
  estimatedTime: string;
  feeDistKm?: number;
  isFreeDelivery?: boolean;
}

export default function CartHeader({ merchantName, merchantId, displayDistKm, orderType, estimatedTime, feeDistKm, isFreeDelivery }: Props) {
  const router = useRouter();
   const m = META[orderType];
  const isRestaurant = orderType === 'restaurant';
  const showChainNote = isRestaurant && !isFreeDelivery && !!feeDistKm && feeDistKm > displayDistKm + 0.2;

  return (

    <View style={S.wrap}>
      {/* Order type badge */}
      <View style={[S.badge, { backgroundColor: m.bg }]}>
        <Text style={{ fontSize: 12 }}>{m.emoji}</Text>
        <Text style={[S.badgeTxt, { color: m.color }]}>
          {m.label}
        </Text>
        {isFreeDelivery && (
          <View style={S.freeTag}>
            <Text
              style={{
                color: '#fff',
                fontSize: 9,
                fontWeight: '800',
              }}
            >
              FREE DELIVERY
            </Text>
          </View>
        )}
      </View>

      {/* Merchant row */}
      <View style={S.row}>
        <Text style={{ fontSize: 18, marginRight: 10 }}>🏪</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.name}>{merchantName}</Text>

          <View style={S.metaRow}>
            {displayDistKm > 0 && (
              <Text style={S.meta}>
                📍 {displayDistKm.toFixed(1)} km away
              </Text>
            )}
            {!!estimatedTime && (
              <Text style={S.meta}>⏱ {estimatedTime}</Text>
            )}
          </View>

          {showChainNote && (
            <Text style={S.chainNote}>
              ℹ️ Delivery fee covers the full route (
              {feeDistKm!.toFixed(1)} km total)
            </Text>
          )}
        </View>

        {isRestaurant && merchantId && (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/(customer)/restaurant/${merchantId}` as any,
              )
            }
            style={S.addBtn}
          >
            <Text
              style={{
                color: COLORS.primary,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              + Add
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
  freeTag: {
    backgroundColor: '#15803D',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 4,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  name: {
    fontWeight: '800',
    color: '#111827',
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  meta: { fontSize: 11, color: '#9CA3AF' },
  chainNote: {
    fontSize: 10,
    color: '#B45309',
    marginTop: 4,
    lineHeight: 14,
  },
  addBtn: { paddingLeft: 10, paddingTop: 2 },
});