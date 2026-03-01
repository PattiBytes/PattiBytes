import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { COLORS } from '../../lib/constants';

export default function InfoTab({ merchant }: { merchant: any }) {
  const rows = [
    { icon: '📍', label: 'Address', value: merchant?.address },
    { icon: '📞', label: 'Phone', value: merchant?.phone, action: merchant?.phone ? () => Linking.openURL(`tel:${merchant.phone}`) : undefined },
    { icon: '✉️', label: 'Email', value: merchant?.email, action: merchant?.email ? () => Linking.openURL(`mailto:${merchant.email}`) : undefined },
    { icon: '🕒', label: 'Hours', value: merchant?.openingtime && merchant?.closingtime ? `${merchant.openingtime} - ${merchant.closingtime}` : null },
    { icon: '🏙️', label: 'City', value: [merchant?.city, merchant?.state, merchant?.postalcode].filter(Boolean).join(', ') },
  ].filter((x) => x.value);

  return (
    <View style={{ padding: 16, gap: 12, paddingBottom: 80 }}>
      {rows.map((r) => (
        <Pressable key={r.label} style={S.row} onPress={r.action} disabled={!r.action}>
          <Text style={{ fontSize: 22, marginRight: 12 }}>{r.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.label}>{r.label.toUpperCase()}</Text>
            <Text style={[S.value, r.action && { color: COLORS.primary }]}>{String(r.value)}</Text>
          </View>
          {r.action ? <Text style={{ fontSize: 18, color: COLORS.primary }}>›</Text> : null}
        </Pressable>
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  row: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 1 },
  label: { fontSize: 10, color: COLORS.textLight, fontWeight: '800', marginBottom: 3 },
  value: { fontSize: 14, fontWeight: '700', color: COLORS.text },
});
