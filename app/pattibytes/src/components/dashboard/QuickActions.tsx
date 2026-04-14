import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { S } from './styles'

const QUICK_ITEMS = [
  { emoji: '📦', label: 'My Orders', route: '/(customer)/orders'       },
  { emoji: '📍', label: 'Addresses', route: '/(customer)/addresses'    },
  { emoji: '🏷️', label: 'Offers',    route: '/(customer)/offers'       },
  { emoji: '✨', label: 'Custom',    route: '/(customer)/custom-order' },
  { emoji: '📋', label: 'Reorder',   route: '/(customer)/orders'       },
  { emoji: '👤', label: 'Profile',   route: '/(customer)/profile'      },
]

export function QuickActions({ onNav }: { onNav: (p: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingVertical: 14 }}
    >
      {QUICK_ITEMS.map(q => (
        <TouchableOpacity key={q.label} style={S.quickAction} onPress={() => onNav(q.route)}>
          <View style={S.quickIcon}>
            <Text style={{ fontSize: 22 }}>{q.emoji}</Text>
          </View>
          <Text style={S.quickLabel}>{q.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}