import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { COLORS } from '../../lib/constants'
import { useDashboardStyles } from './styles'
import { ShopCategory } from './types'

// Metadata lookup for known category keys
const CATEGORY_META: Record<string, Omit<ShopCategory, 'key' | 'label' | 'route' | 'count'>> = {
  food:          { emoji: '\uD83C\uDF71', bg: '#FFF3EE', text: COLORS.primary },
  dairy:         { emoji: '\uD83E\uDD5B', bg: '#DBEAFE', text: '#1D4ED8' },
  grocery:       { emoji: '\uD83D\uDED2', bg: '#D1FAE5', text: '#065F46' },
  groceries:     { emoji: '\uD83D\uDED2', bg: '#D1FAE5', text: '#065F46' },
  medicines:     { emoji: '\uD83D\uDC8A', bg: '#FEE2E2', text: '#991B1B' },
  medicine:      { emoji: '\uD83D\uDC8A', bg: '#FEE2E2', text: '#991B1B' },
  bakery:        { emoji: '\uD83C\uDF82', bg: '#FCE7F3', text: '#9D174D' },
  beverages:     { emoji: '\uD83E\uDD64', bg: '#E0F2FE', text: '#0369A1' },
  snacks:        { emoji: '\uD83C\uDF7F', bg: '#FEF9C3', text: '#854D0E' },
  fruits:        { emoji: '\uD83C\uDF4E', bg: '#DCFCE7', text: '#166534' },
  vegetables:    { emoji: '\uD83E\uDD66', bg: '#D1FAE5', text: '#065F46' },
  personal_care: { emoji: '\uD83E\uDDF4', bg: '#F3E8FF', text: '#6B21A8' },
  household:     { emoji: '\uD83E\uDDF9', bg: '#FEF3C7', text: '#B45309' },
  stationery:    { emoji: '\uD83D\uDCDD', bg: '#EDE9FE', text: '#4C1D95' },
  electronics:   { emoji: '\uD83D\uDCF1', bg: '#DBEAFE', text: '#1E40AF' },
  clothing:      { emoji: '\uD83D\uDC55', bg: '#FCE7F3', text: '#9D174D' },
  toys:          { emoji: '\uD83C\uDFAE', bg: '#FFF3EE', text: COLORS.primary },
  pet:           { emoji: '\uD83D\uDC3E', bg: '#FEF9C3', text: '#854D0E' },
}

const DEFAULT_META = { emoji: '\uD83D\uDCE6', bg: '#F3F4F6', text: '#374151' }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

type Props = {
  categories: ShopCategory[]     // from useDashboard hook (DB-driven)
  loadingCategories?: boolean
  onNav: (p: string) => void
}

export function ShopByCategory({ categories, loadingCategories, onNav }: Props) {
  const S = useDashboardStyles()
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[S.sectionHeader, { paddingHorizontal: 16, marginBottom: 10 }]}>
        <Text style={S.secTitle}>Categories</Text>
        <TouchableOpacity onPress={() => onNav('/(customer)/shop')}>
          <Text style={S.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>

      {loadingCategories ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
        >
          {categories.map(cat => {
            const meta = CATEGORY_META[cat.key.toLowerCase()] ?? DEFAULT_META
            return (
              <TouchableOpacity
                key={cat.key}
                style={{
                  backgroundColor: meta.bg,
                  borderRadius: 16,
                  padding: 14,
                  alignItems: 'center',
                  minWidth: 72,
                }}
                onPress={() => onNav(cat.route)}
              >
                <Text style={{ fontSize: 26, marginBottom: 5 }}>{meta.emoji}</Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: meta.text, textAlign: 'center' }}>
                  {cat.label}
                </Text>
                {cat.count !== undefined ? (
                  <Text style={{ fontSize: 9, color: meta.text, opacity: 0.7, marginTop: 2 }}>
                    {String(cat.count) + ' items'}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )
          })}

          {/* Custom Order — always shown */}
          <TouchableOpacity
            style={{ backgroundColor: '#F5F3FF', borderRadius: 16, padding: 14, alignItems: 'center', minWidth: 72 }}
            onPress={() => onNav('/(customer)/custom-order')}
          >
            <Text style={{ fontSize: 26, marginBottom: 5 }}>{'\uD83D\uDCDD'}</Text>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#5B21B6', textAlign: 'center' }}>
              Custom
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  )
}