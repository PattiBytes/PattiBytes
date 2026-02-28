import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import type { GlobalDeal } from '../../types/dashboard'

type Props = { deals: GlobalDeal[]; onViewAll: () => void }

export default function GlobalDeals({ deals, onViewAll }: Props) {
  if (!deals.length) return null
  return (
    <View style={{ marginTop: 8, marginBottom: 16 }}>
      <View style={S.sectionHeader}>
        <Text style={S.secTitle}>Today&apos;s Deals</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={S.seeAll}>All Offers</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {deals.map(deal => {
          const isBxgy   = deal.dealtype === 'bxgy'
          const label    = isBxgy
            ? `Buy ${deal.dealjson?.buy?.qty ?? 1} Get ${deal.dealjson?.get?.qty ?? 1} FREE`
            : deal.discounttype === 'percentage'
            ? `${deal.discountvalue}% OFF`
            : `₹${deal.discountvalue} OFF`
          const bgColor  = isBxgy ? '#7C3AED' : COLORS.primary
          return (
            <TouchableOpacity key={deal.id} style={[S.card, { backgroundColor: bgColor }]} onPress={onViewAll}>
              <Text style={{ fontSize: 20, marginBottom: 4 }}>{isBxgy ? '🎁' : '🏷️'}</Text>
              <Text style={S.dealLabel}>{label}</Text>
              <Text style={S.dealCode}>{deal.code}</Text>
              {!!deal.minorderamount && (
                <Text style={S.dealMin}>Min ₹{deal.minorderamount}</Text>
              )}
              {!!deal.validuntil && (
                <Text style={S.dealExp}>
                  Ends {new Date(deal.validuntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  secTitle:      { fontSize: 17, fontWeight: '900', color: '#111827' },
  seeAll:        { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  card:          { borderRadius: 16, padding: 14, width: 140, alignItems: 'center' },
  dealLabel:     { fontSize: 15, fontWeight: '900', color: '#fff', textAlign: 'center' },
  dealCode:      { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 5, letterSpacing: 1.5, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  dealMin:       { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  dealExp:       { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
})