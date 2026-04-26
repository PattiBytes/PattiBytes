import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { ActiveOrder } from './types'
import { STATUS_COLORS } from './constants'
import { useDashboardStyles } from './styles'
import { COLORS } from '../../lib/constants'

type Props = {
  orders: ActiveOrder[]
  onNav: (p: string) => void
}

export function ActiveOrders({ orders, onNav }: Props) {
  const S = useDashboardStyles()
  if (!orders.length) return null
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
      <View style={[S.sectionHeader, { marginBottom: 10 }]}>
        <Text style={S.secTitle}>🚀 Active Orders</Text>
        <TouchableOpacity onPress={() => onNav('/(customer)/orders')}>
          <Text style={S.seeAll}>See All →</Text>
        </TouchableOpacity>
      </View>
      {orders.map(o => (
        <TouchableOpacity
          key={o.id}
          style={S.activeCard}
          onPress={() => onNav(`/(customer)/orders/${o.id}`)}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: COLORS.text }}>
              {o.merchant_name ?? 'Restaurant'}
            </Text>
            <Text style={{ color: COLORS.primary, fontWeight: '700', marginTop: 2, fontSize: 13 }}>
              {`₹${Number(o.total_amount).toFixed(2)}`}
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
              {`#${o.order_number}`}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={[S.statusPill, { backgroundColor: STATUS_COLORS[o.status] ?? '#888' }]}>
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