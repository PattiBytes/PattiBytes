// src/components/custom-orders/CustomOrderHistory.tsx
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../lib/constants';
import { CustomOrderRecord } from './types';
import { getCatColors, getCatInfo, formatDate } from './helpers';
import { S } from './styles';

type Props = {
  loading: boolean;
  orders: CustomOrderRecord[];
  onRefresh: () => void;
};

export function CustomOrderHistory({ loading, orders, onRefresh }: Props) {
  const router = useRouter();

  return (
    <ScrollView
      contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      <View style={{
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 4,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
          My custom requests
        </Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 13 }}>
            ↻ Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />
      ) : orders.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>📋</Text>
          <Text style={{ fontWeight: '800', fontSize: 16, color: '#111827', marginBottom: 6 }}>
            No custom requests yet
          </Text>
          <Text style={{ color: '#6B7280', marginBottom: 20, textAlign: 'center' }}>
            Describe what you need and we&apos;ll source it!
          </Text>
        </View>
      ) : (
        orders.map(o => {
          // ── safe: custom_category is optional, category is the DB string ──
          const cats = o.custom_category ?? (o.category ? o.category.split(',') : ['other']);
          const firstCat = (cats[0] ?? 'other').trim();

          const info   = getCatInfo(firstCat);
          const colors = getCatColors(firstCat);

          const statusColor: Record<string, string> = {
            pending:    '#F59E0B',
            quoted:     '#3B82F6',
            confirmed:  '#2563EB',
            processing: '#8B5CF6',
            completed:  '#22C55E',
            delivered:  '#22C55E',
            cancelled:  '#EF4444',
          };
          const dotColor = statusColor[o.status] ?? '#9CA3AF';

          // linked order — order_id and linked_order_id are the same value
          const linkedId = o.linked_order_id ?? o.order_id;

          return (
            <View key={o.id} style={S.histCard}>
              {/* Category chip + status pill */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={[S.catChip, { backgroundColor: colors.bg }]}>
                  <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.text, marginLeft: 5 }}>
                    {info.label}
                  </Text>
                </View>
                <View style={[S.statusPill, { backgroundColor: dotColor }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                    {o.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Ref */}
              <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 6, fontWeight: '700' }}>
                #{o.custom_order_ref}
              </Text>

              {/* Description */}
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20, marginTop: 6 }} numberOfLines={3}>
                {o.description}
              </Text>

              {/* Budget / total */}
              {(o.budget ?? o.total_amount) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <Text style={{ fontSize: 12 }}>💰</Text>
                  <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700', marginLeft: 4 }}>
                    {o.quoted_amount
                      ? `Quoted: ₹${o.quoted_amount}`
                      : `Budget: ₹${o.budget ?? o.total_amount}`}
                  </Text>
                </View>
              ) : null}

              {/* Quote message */}
              {o.quote_message ? (
                <View style={{
                  backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8, marginTop: 8,
                  borderWidth: 1, borderColor: '#BFDBFE',
                }}>
                  <Text style={{ fontSize: 12, color: '#1D4ED8', fontWeight: '700' }}>💬 Quote message</Text>
                  <Text style={{ fontSize: 12, color: '#374151', marginTop: 2 }}>{o.quote_message}</Text>
                </View>
              ) : null}

              {/* Footer: badge + date */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <View style={S.customBadge}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>CUSTOM ORDER</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                  🕐 {formatDate(o.created_at)}   {/* ← fixed: was o.createdat */}
                </Text>
              </View>

              {/* View order button */}
              {linkedId ? (
                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <TouchableOpacity
                    onPress={() => router.push(`/(customer)/orders/${linkedId}` as any)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      borderRadius: 999, backgroundColor: COLORS.primary,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      View full order
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}
