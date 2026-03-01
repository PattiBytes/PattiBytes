import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../../lib/constants';

export type RestaurantTabKey = 'menu' | 'info' | 'reviews';

export default function RestaurantTabs({
  active,
  onChange,
  reviewsCount,
}: {
  active: RestaurantTabKey;
  onChange: (t: RestaurantTabKey) => void;
  reviewsCount: number;
}) {
  const tabs: { key: RestaurantTabKey; label: string }[] = [
    { key: 'menu', label: 'Menu' },
    { key: 'info', label: 'Info' },
    { key: 'reviews', label: `Reviews (${reviewsCount})` },
  ];

  return (
    <View style={S.tabs}>
      {tabs.map((t) => {
        const isA = active === t.key;
        return (
          <Pressable key={t.key} style={[S.tab, isA && S.tabActive]} onPress={() => onChange(t.key)}>
            <Text style={[S.tabTxt, isA && S.tabTxtActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabTxt: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  tabTxtActive: { color: COLORS.primary, fontWeight: '900' },
});
