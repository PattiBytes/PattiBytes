import React from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, StyleSheet,
} from 'react-native'
import { COLORS } from '../../lib/constants'
import type { MenuResult } from '../../types/dashboard'

type Props = {
  results:    MenuResult[]
  searching:  boolean
  query:      string
  onPress:    (merchantId: string) => void
}

export default function MenuSearchResults({ results, searching, query, onPress }: Props) {
  if (query.trim().length < 2) return null

  return (
    <View style={{ marginHorizontal: 12, marginBottom: 12 }}>
      {searching ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
      ) : results.length === 0 ? (
        <Text style={{ color: '#9CA3AF', textAlign: 'center', padding: 12, fontSize: 13 }}>
          No menu items found for &quot;{query}&quot;
        </Text>
      ) : (
        <>
          <Text style={S.secTitle}>Menu Results</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {results.map(item => {
              const disc = item.discountpercentage
                ? item.price * (1 - item.discountpercentage / 100)
                : item.price
              return (
                <TouchableOpacity key={item.id} style={S.card} onPress={() => onPress(item.merchantid)}>
                  <View style={S.imgBox}>
                    {item.imageurl
                      ? <Image source={{ uri: item.imageurl }} style={{ width: 64, height: 64, borderRadius: 10 }} />
                      : <Text style={{ fontSize: 28 }}>🍽️</Text>}
                  </View>
                  <Text style={S.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={S.price}>₹{disc.toFixed(0)}</Text>
                  <Text style={S.merchant} numberOfLines={1}>{item.merchantname}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  secTitle: { fontSize: 15, fontWeight: '900', color: '#111827', marginBottom: 8, paddingHorizontal: 4 },
  card:     { backgroundColor: '#fff', borderRadius: 14, padding: 12, alignItems: 'center', width: 110, elevation: 1 },
  imgBox:   { width: 64, height: 64, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  name:     { fontSize: 12, fontWeight: '700', color: '#111827' },
  price:    { fontSize: 11, color: COLORS.primary, fontWeight: '800', marginTop: 2 },
  merchant: { fontSize: 10, color: '#6B7280' },
})