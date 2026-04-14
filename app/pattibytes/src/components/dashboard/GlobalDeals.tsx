import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { GlobalDeal } from './types'
import { S } from './styles'
import { COLORS } from '../../lib/constants'

type Props = {
  deals: GlobalDeal[]
  onNav: (p: string) => void
}

export function GlobalDeals({ deals, onNav }: Props) {
  if (!deals.length) return null
  return (
    <View style={{ marginTop: 8, marginBottom: 16 }}>
      <View style={[S.sectionHeader, { paddingHorizontal: 16, marginBottom: 12 }]}>
        {/* Use unicode escape to avoid emoji variation-selector parsing issues */}
        <Text style={S.secTitle}>{'\uD83C\uDFF7 Today\'s Deals'}</Text>
        <TouchableOpacity onPress={() => onNav('/(customer)/offers')}>
          <Text style={S.seeAll}>{'All Offers \u2192'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {deals.map(deal => {
          const isBxgy = deal.deal_type === 'bxgy'
          const label = isBxgy
            ? 'Buy ' + String(deal.deal_json?.buy?.qty ?? 1) + ' Get ' + String(deal.deal_json?.get?.qty ?? 1) + ' FREE'
            : deal.discount_type === 'percentage'
            ? String(deal.discount_value) + '% OFF'
            : '\u20B9' + String(deal.discount_value) + ' OFF'
          const bgColor = isBxgy ? '#7C3AED' : COLORS.primary
          return (
            <TouchableOpacity
              key={deal.id}
              style={[S.dealCard, { backgroundColor: bgColor }]}
              onPress={() => onNav('/(customer)/offers')}
            >
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{isBxgy ? '\uD83C\uDF81' : '\uD83C\uDFF7'}</Text>
              <Text style={S.dealLabel}>{label}</Text>
              <Text style={S.dealCode}>{deal.code}</Text>
              {deal.min_order_amount ? (
                <Text style={S.dealMin}>{'Min \u20B9' + String(deal.min_order_amount)}</Text>
              ) : null}
              {deal.valid_until ? (
                <Text style={S.dealExp}>
                  {'Ends ' + new Date(deal.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              ) : null}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}