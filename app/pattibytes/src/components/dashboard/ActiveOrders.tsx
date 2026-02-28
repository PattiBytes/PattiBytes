import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { STATUS_COLORS } from '../../types/dashboard'
import type { ActiveOrder } from '../../types/dashboard'

type Props = {
  orders:     ActiveOrder[]
  onPress:    (id: string) => void
  onViewAll:  () => void
}

export default function ActiveOrders({ orders, onPress, onViewAll }: Props) {
  if (!orders.length) return null
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <View style={S.sectionHeader}>
        <Text style={S.secTitle}>Active Orders</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={S.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {orders.map(o => (
        <TouchableOpacity key={o.id} style={S.card} onPress={() => onPress(o.id)}>
          <View style={{ flex: 1 }}>
            <Text style={S.merchant}>{o.merchantname ?? 'Restaurant'}</Text>
            <Text style={S.amount}>₹{Number(o.totalamount).toFixed(2)}</Text>
            <Text style={S.orderNo}>#{o.ordernumber}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[S.pill, { backgroundColor: STATUS_COLORS[o.status] ?? '#888' }]}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>
                {o.status.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>Track →</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const S = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  secTitle:      { fontSize: 17, fontWeight: '900', color: '#111827' },
  seeAll:        { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  card:          { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  merchant:      { fontWeight: '800', fontSize: 14, color: '#111827' },
  amount:        { color: COLORS.primary, fontWeight: '700', marginTop: 2, fontSize: 13 },
  orderNo:       { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  pill:          { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
})