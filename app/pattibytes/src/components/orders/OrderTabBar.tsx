import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'

export type TabKey = 'active' | 'completed' | 'cancelled'

interface Props {
  activeTab: TabKey
  counts:    Record<TabKey, number>
  onChange:  (tab: TabKey) => void
}

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'active',    label: 'Active',    emoji: '🔄' },
  { key: 'completed', label: 'Done',      emoji: '✅' },
  { key: 'cancelled', label: 'Cancelled', emoji: '❌' },
]

export default function OrderTabBar({ activeTab, counts, onChange }: Props) {
  return (
    <View style={S.row}>
      {TABS.map(t => (
        <TouchableOpacity
          key={t.key}
          style={[S.tab, activeTab === t.key && S.tabActive]}
          onPress={() => onChange(t.key)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
          <Text style={[S.label, activeTab === t.key && S.labelActive]}>
            {t.label}
          </Text>
          {counts[t.key] > 0 && (
            <View style={[S.badge, activeTab === t.key && { backgroundColor: COLORS.primary }]}>
              <Text style={{ color: activeTab === t.key ? '#fff' : '#6B7280', fontSize: 10, fontWeight: '800' }}>
                {counts[t.key]}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  )
}

const S = StyleSheet.create({
  row:        { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab:        { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5 },
  tabActive:  { borderBottomWidth: 2.5, borderBottomColor: COLORS.primary },
  label:      { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  labelActive:{ color: COLORS.primary, fontWeight: '800' },
  badge:      { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
})
