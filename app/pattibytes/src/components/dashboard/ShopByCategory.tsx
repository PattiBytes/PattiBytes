import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

const CATS = [
  { id: 'food',      label: 'Food',     emoji: '🍔', bg: '#FFF3EE', text: COLORS.primary,  route: 'customer/shop?cat=food' },
  { id: 'dairy',     label: 'Dairy',    emoji: '🥛', bg: '#DBEAFE', text: '#1D4ED8',       route: 'customer/shop?cat=dairy' },
  { id: 'grocery',   label: 'Grocery',  emoji: '🛒', bg: '#D1FAE5', text: '#065F46',       route: 'customer/shop?cat=grocery' },
  { id: 'medicines', label: 'Medicine', emoji: '💊', bg: '#FEE2E2', text: '#991B1B',       route: 'customer/shop?cat=medicines' },
  { id: 'bakery',    label: 'Bakery',   emoji: '🎂', bg: '#FCE7F3', text: '#9D174D',       route: 'customer/shop?cat=bakery' },
  { id: 'custom',    label: 'Custom',   emoji: '✏️', bg: '#F5F3FF', text: '#5B21B6',       route: 'customer/custom-order' },
]

export default function ShopByCategory({ onNav }: { onNav: (p: string) => void }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={S.sectionHeader}>
        <Text style={S.secTitle}>Categories</Text>
        <TouchableOpacity onPress={() => onNav('customer/shop')}>
          <Text style={S.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
      >
        {CATS.map(c => (
          <TouchableOpacity
            key={c.id}
            style={{ backgroundColor: c.bg, borderRadius: 16, padding: 14, alignItems: 'center', minWidth: 70 }}
            onPress={() => onNav(c.route)}
          >
            <Text style={{ fontSize: 26, marginBottom: 5 }}>{c.emoji}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: c.text, textAlign: 'center' }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const S = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  secTitle:      { fontSize: 17, fontWeight: '900', color: '#111827' },
  seeAll:        { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
})