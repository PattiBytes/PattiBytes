import React from 'react'
import { ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native'

const ACTIONS = [
  { emoji: '📦', label: 'My Orders',  route: 'customer/orders' },
  { emoji: '📍', label: 'Addresses',  route: 'customer/addresses' },
  { emoji: '🎁', label: 'Offers',     route: 'customer/offers' },
  { emoji: '✏️', label: 'Custom',     route: 'customer/custom-order' },
  { emoji: '🔁', label: 'Reorder',    route: 'customer/orders' },
  { emoji: '👤', label: 'Profile',    route: 'customer/profile' },
]

export default function QuickActions({ onNav }: { onNav: (route: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 14 }}
    >
      {ACTIONS.map(q => (
        <TouchableOpacity key={q.label} style={S.action} onPress={() => onNav(q.route)}>
          <View style={S.icon}>
            <Text style={{ fontSize: 22 }}>{q.emoji}</Text>
          </View>
          <Text style={S.label}>{q.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const S = StyleSheet.create({
  action: { alignItems: 'center', gap: 5 },
  icon:   { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  label:  { fontSize: 10, color: '#6B7280', fontWeight: '700' },
})