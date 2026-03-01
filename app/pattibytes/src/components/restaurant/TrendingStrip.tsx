import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, ScrollView } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function TrendingStrip({
  items,
  loading,
  showImages,
  onOpen,
}: {
  items: any[];
  loading: boolean;
  showImages: boolean;
  onOpen: (item: any) => void;
}) {
  if (loading) {
    return (
      <View style={S.wrap}>
        <Text style={S.title}>🔥 Trending</Text>
        <Text style={S.sub}>Loading...</Text>
      </View>
    );
  }

  if (!items?.length) return null;

  return (
    <View style={S.wrap}>
      <Text style={S.title}>🔥 Trending</Text>
      <Text style={S.sub}>Most ordered in last 7 days</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 6, marginTop: 10 }}>
        {items.map((t) => (
          <Pressable key={t.key} style={S.card} onPress={() => onOpen(t)}>
            {showImages ? (
              t.image_url ? (
                <Image source={{ uri: t.image_url }} style={S.img} resizeMode="cover" />
              ) : (
                <View style={[S.img, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 20 }}>🍔</Text>
                </View>
              )
            ) : null}

            <Text style={S.name} numberOfLines={1}>
              {t.name}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={S.price}>₹{Number(t.price ?? 0).toFixed(0)}</Text>
              <Text style={S.qty}>{Number(t.totalQty ?? 0)}+</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { marginHorizontal: 12, marginTop: 10, backgroundColor: '#FFF', borderRadius: 16, padding: 14, elevation: 2 },
  title: { fontWeight: '900', color: COLORS.text, fontSize: 14 },
  sub: { color: COLORS.textLight, fontSize: 11, marginTop: 3, fontWeight: '700' },

  card: { width: 140, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#F3F4F6', padding: 10 },
  img: { width: '100%', height: 70, borderRadius: 10, marginBottom: 8 },
  name: { fontWeight: '900', color: COLORS.text, fontSize: 12 },
  price: { fontWeight: '900', color: COLORS.primary, fontSize: 12 },
  qty: { fontWeight: '900', color: '#6B7280', fontSize: 12 },
});
