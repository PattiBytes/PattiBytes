 
import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { COLORS } from '../../lib/constants'
import Pressable3D from '../ui/Pressable3D'
import { SortKey } from './menuTabShared'

interface MenuTabToolbarProps {
  merchantName: string
  query: string
  onChangeQuery: (v: string) => void
  onClearQuery: () => void
  vegOnly: boolean
  featuredOnly: boolean
  availNowOnly: boolean
  timingUnavailableCount: number
  sort: SortKey
  onToggleVeg: () => void
  onToggleFeatured: () => void
  onToggleAvailNow: () => void
  onCycleSort: () => void
  onExpandAll: () => void
  onCollapseAll: () => void
  onClearAll: () => void
  onGoFullMenu: () => void
}

function MenuTabToolbarComponent({
  merchantName,
  query,
  onChangeQuery,
  onClearQuery,
  vegOnly,
  featuredOnly,
  availNowOnly,
  timingUnavailableCount,
  sort,
  onToggleVeg,
  onToggleFeatured,
  onToggleAvailNow,
  onCycleSort,
  onExpandAll,
  onCollapseAll,
  onClearAll,
  onGoFullMenu,
}: MenuTabToolbarProps) {
  const sortLabel =
    sort === 'recommended'
      ? 'Recommended'
      : sort === 'name'
      ? 'Name'
      : sort === 'price_low'
      ? 'Low→High'
      : 'High→Low'

  return (
    <View style={S.controls}>
      <View style={S.topActions}>
        <Pressable3D style={S.fullMenuBtn} onPress={onGoFullMenu}>
          <Text style={S.fullMenuBtnTxt}>📋 View Full Menu</Text>
        </Pressable3D>

        <Pressable3D style={S.clearBtn} onPress={onClearAll}>
          <Text style={S.clearBtnTxt}>Clear</Text>
        </Pressable3D>
      </View>

      <View style={S.searchRow}>
        <Text style={{ fontSize: 16 }}>🔎</Text>
        <TextInput
          value={query}
          onChangeText={onChangeQuery}
          placeholder={`Search in ${merchantName}...`}
          placeholderTextColor="#9CA3AF"
          style={S.searchInput}
        />
        {!!query && (
          <Pressable onPress={onClearQuery}>
            <Text style={{ fontSize: 16, color: '#9CA3AF' }}>✕</Text>
          </Pressable>
        )}
      </View>

      <View style={S.filterRow}>
        <Pressable3D style={[S.chip, vegOnly && S.chipActive]} onPress={onToggleVeg}>
          <Text style={[S.chipTxt, vegOnly && S.chipTxtActive]}>🌿 Veg</Text>
        </Pressable3D>

        <Pressable3D
          style={[S.chip, featuredOnly && S.chipActive]}
          onPress={onToggleFeatured}
        >
          <Text style={[S.chipTxt, featuredOnly && S.chipTxtActive]}>
            ⭐ Featured
          </Text>
        </Pressable3D>

        <Pressable3D
          style={[S.chip, availNowOnly && S.chipActive]}
          onPress={onToggleAvailNow}
        >
          <Text style={[S.chipTxt, availNowOnly && S.chipTxtActive]}>
            🕐 Now
            {timingUnavailableCount > 0 && !availNowOnly
              ? ` (−${timingUnavailableCount})`
              : ''}
          </Text>
        </Pressable3D>

        <Pressable3D style={S.chip} onPress={onCycleSort}>
          <Text style={S.chipTxt}>↕ {sortLabel}</Text>
        </Pressable3D>

        <Pressable3D style={S.miniBtn} onPress={onExpandAll}>
          <Text style={S.miniBtnTxt}>Expand</Text>
        </Pressable3D>

        <Pressable3D style={S.miniBtn} onPress={onCollapseAll}>
          <Text style={S.miniBtnTxt}>Collapse</Text>
        </Pressable3D>
      </View>
    </View>
  )
}

export default memo(MenuTabToolbarComponent)

const S = StyleSheet.create({
  controls: {
    padding: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginTop: 10,
    borderRadius: 16,
    marginHorizontal: 12,
    elevation: 2,
  },
  topActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  fullMenuBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMenuBtnTxt: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  clearBtn: {
    width: 90,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  clearBtnTxt: {
    color: COLORS.text,
    fontWeight: '900',
    fontSize: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#EEF2F7',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipTxt: {
    fontWeight: '900',
    color: '#374151',
    fontSize: 12,
  },
  chipTxtActive: {
    color: '#FFF',
  },
  miniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  miniBtnTxt: {
    fontWeight: '900',
    color: COLORS.text,
    fontSize: 11,
  },
})