import React, { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { COLORS } from '../../lib/constants'
import Pressable3D from '../ui/Pressable3D'

interface MenuCategoryHeaderProps {
  title: string
  totalItems: number
  unavailableCount: number
  isOpen: boolean
  onPress: () => void
}

function MenuCategoryHeaderComponent({
  title,
  totalItems,
  unavailableCount,
  isOpen,
  onPress,
}: MenuCategoryHeaderProps) {
  return (
    <Pressable3D style={S.catHeader} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <View style={S.titleRow}>
          <Text style={S.catTitle}>{title}</Text>
          {unavailableCount > 0 && (
            <View style={S.timingCatBadge}>
              <Text style={S.timingCatTxt}>⏸ {unavailableCount} unavailable</Text>
            </View>
          )}
        </View>
        <Text style={S.catCount}>{totalItems} items</Text>
      </View>

      <Text style={S.chevron}>{isOpen ? '▾' : '▸'}</Text>
    </Pressable3D>
  )
}

export default memo(MenuCategoryHeaderComponent)

const S = StyleSheet.create({
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.text,
  },
  catCount: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '800',
    marginTop: 2,
  },
  timingCatBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  timingCatTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  chevron: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
  },
})