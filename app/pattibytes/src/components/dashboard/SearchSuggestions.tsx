import React, { memo } from 'react'
import {
  Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { COLORS } from '../../lib/constants'

interface Props {
  visible:          boolean
  query:            string
  recentSearches:   string[]
  suggestions:      string[]          // fuzzy-matched from restaurant/item names
  onSelect:         (term: string) => void
  onClearRecent:    () => void
}

export default memo(function SearchSuggestions({
  visible, query, recentSearches, suggestions, onSelect, onClearRecent,
}: Props) {
  if (!visible) return null

  const showRecent      = recentSearches.length > 0 && query.trim().length === 0
  const showSuggestions = suggestions.length > 0 && query.trim().length >= 1

  if (!showRecent && !showSuggestions) return null

  return (
    <View style={S.container}>

      {/* ── Recent Searches ── */}
      {showRecent && (
        <View style={S.section}>
          <View style={S.sectionHead}>
            <Text style={S.sectionTitle}>🕐 Recent</Text>
            <Pressable onPress={onClearRecent} hitSlop={8}>
              <Text style={S.clearTxt}>Clear all</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.chips}
          >
            {recentSearches.map(term => (
              <Pressable
                key={term}
                style={({ pressed }) => [S.chip, S.recentChip, pressed && { opacity: 0.75 }]}
                onPress={() => onSelect(term)}
              >
                <Text style={S.chipIcon}>↩</Text>
                <Text style={S.recentTxt} numberOfLines={1}>{term}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Fuzzy Suggestions ── */}
      {showSuggestions && (
        <View style={S.section}>
          <Text style={[S.sectionTitle, { paddingHorizontal: 14, marginBottom: 8 }]}>
            💡 Suggestions
          </Text>
          {suggestions.map(term => {
            // Bold the matching part
            const idx = term.toLowerCase().indexOf(query.toLowerCase())
            const before = idx >= 0 ? term.slice(0, idx) : term
            const match  = idx >= 0 ? term.slice(idx, idx + query.length) : ''
            const after  = idx >= 0 ? term.slice(idx + query.length) : ''

            return (
              <Pressable
                key={term}
                style={({ pressed }) => [S.suggRow, pressed && { backgroundColor: '#F9FAFB' }]}
                onPress={() => onSelect(term)}
              >
                <Text style={S.suggIcon}>🔍</Text>
                <Text style={S.suggTxt} numberOfLines={1}>
                  {idx >= 0 ? (
                    <>
                      <Text style={S.suggNormal}>{before}</Text>
                      <Text style={S.suggBold}>{match}</Text>
                      <Text style={S.suggNormal}>{after}</Text>
                    </>
                  ) : term}
                </Text>
                <Text style={S.suggArrow}>↗</Text>
              </Pressable>
            )
          })}
        </View>
      )}
    </View>
  )
})

const S = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  section:     { paddingVertical: 10 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14, marginBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#374151' },
  clearTxt:     { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  chips: { paddingHorizontal: 14, gap: 8 },
  chip:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1,
  },
  recentChip: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  chipIcon:   { fontSize: 12, color: '#9CA3AF' },
  recentTxt:  { fontSize: 12, fontWeight: '700', color: '#374151', maxWidth: 120 },

  suggRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: '#F9FAFB',
  },
  suggIcon:   { fontSize: 13, color: '#9CA3AF', width: 18 },
  suggTxt:    { flex: 1, fontSize: 13 },
  suggNormal: { color: '#6B7280', fontWeight: '500' },
  suggBold:   { color: '#111827', fontWeight: '900' },
  suggArrow:  { fontSize: 12, color: '#D1D5DB' },
})